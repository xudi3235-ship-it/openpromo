import asyncio
from typing import Literal

from agents import function_tool
from google import genai
from google.genai.types import (
    GeneratedVideo,
    GenerateVideosOperation,
    GenerateVideosSource,
    Video,
    VideoGenerationReferenceType,
)
from google.genai.types import Image as GeminiImage
from pydantic import BaseModel, Field

from src.core.shared import get_env_or_raise


class ConfigParams(BaseModel):
    resolution: Literal["720p", "1080p"] = Field(
        "720p", description="Resolution of the generated video"
    )
    number_of_videos: int = Field(
        1, description="Number of videos to generate, only set to 1"
    )
    duration_seconds: Literal[4, 6, 8] = Field(
        8, description="Duration of the generated video in seconds"
    )
    aspect_ratio: Literal["9:16", "16:9"] = Field(
        "9:16", description="Aspect ratio of the generated video"
    )


@function_tool
async def run_gemini_veo31(
    prompt: str,
    output_path: str,
    config: ConfigParams,
    reference_images: list[str] | None = None,
    input_image_path: str | None = None,
    input_last_frame_path: str | None = None,
    input_video_uri: str | None = None,
):
    """powerful, single api for video generation and extension using Gemini VEO-3.1 model. this tool is capabale of text to video, images to video(with references), and video extension(using previous video as base). it runs, polls, and downloads the generated video.
    full doc: https://ai.google.dev/gemini-api/docs/video.md.txt

    use reference_images to do "ingridients to video" generation, for strong consistency

    by default, the input_image_path is the first frame. optionally, you can provide input_last_frame_path for frame interpolation.

    for generating using reference!! use the reference_images param to provide up to 3 ref images. This is used as assets, e.g. refer to dress_image, woman_image, and glasses_image. which ensures accuracy.

    CRITICAL: when using reference image, use 16:9 aspect ratio only.
    The following use cases are supported:
    1. Text to video generation.
    2a. Image to video generation (additional text prompt is optional).
    2b. Image to video generation with frame interpolation (specify last_frame
    in config).
    3. Video extension (additional text prompt is optional). ONLY supports video uri generated from veo3.1

    Args:
        prompt: text prompt for video generation
        output_path: path to save the generated video
        input_image_path: image that used as first frame to guide generation.
        input_last_frame_path: optional path to input last frame image for frame interpolation, has to used with input_image_path.
        reference_images: optional list of paths to reference images to guide video generation. if provided, then only provide prompt.
        input_video_uri: optional uri to input video to extend, has to be the previously generated veo3.1 video uri.
    """
    print(
        f">>> Running Gemini VEO-3.1 with inputs: {prompt}, {input_image_path}, {input_video_uri}, {config}"
    )
    MODEL_ID = "veo-3.1-generate-preview"
    # MODEL_ID = "veo-3.1-fast-generate-preview"
    client = genai.Client(api_key=get_env_or_raise("GEMINI_API_KEY"))

    if input_image_path and input_video_uri:
        return {
            "status": "error",
            "message": "Please provide either input_image_path or input_video_uri, not both.",
        }
    if input_last_frame_path and not input_image_path:
        return {
            "status": "error",
            "message": "input_last_frame_path requires input_image_path to be set.",
        }
    if reference_images and (input_image_path or input_video_uri):
        return {
            "status": "error",
            "message": "reference_images cannot be used with input_image_path or input_video_uri.",
        }
    if reference_images and config.aspect_ratio != "16:9":
        return {
            "status": "error",
            "message": "When using reference_images, aspect_ratio must be set to 16:9.",
        }

    input_video = Video(uri=input_video_uri) if input_video_uri is not None else None

    input_image = (
        GeminiImage.from_file(location=input_image_path)
        if input_image_path is not None
        else None
    )

    input_last_frame = (
        GeminiImage.from_file(location=input_last_frame_path)
        if input_last_frame_path is not None
        else None
    )

    ref_imgs = [
        GeminiImage.from_file(location=img_path)
        for img_path in (reference_images or [])
    ]

    ref_imgs_obj = (
        [
            genai.types.VideoGenerationReferenceImage(
                image=dress_image,  # Generated separately with Nano Banana
                reference_type=VideoGenerationReferenceType.ASSET,
            )
            for dress_image in ref_imgs
        ]
        if ref_imgs
        else None
    )

    # https://ai.google.dev/gemini-api/docs/video?example=dialogue#veo-model-parameters
    operation: GenerateVideosOperation = client.models.generate_videos(
        model=MODEL_ID,
        source=GenerateVideosSource(
            prompt=prompt,
            image=input_image,
            video=input_video,
        ),
        config=genai.types.GenerateVideosConfig(
            number_of_videos=config.number_of_videos,
            duration_seconds=config.duration_seconds,
            resolution=config.resolution,
            aspect_ratio=config.aspect_ratio,
            last_frame=input_last_frame,
            reference_images=ref_imgs_obj,
        ),
    )
    video = await poll_veo31_operation_and_get_video(operation)
    save_video_to_path(video, output_path)
    return {
        "status": "success",
        "message": f"Video generated and saved to {output_path}",
        "output_path": output_path,
        "video_uri": video.uri,
    }


async def test_veo31_extension():
    import time

    client = genai.Client(api_key=get_env_or_raise("GEMINI_API_KEY"))
    prompt = "A cinematic, haunting video. A ghostly woman with long white hair and a flowing dress swings gently on a rope swing beneath a massive, gnarled tree in a foggy, moonlit clearing. The fog thickens and swirls around her, and she slowly fades away, vanishing completely. The empty swing is left swaying rhythmically on its own in the eerie silence."

    operation = client.models.generate_videos(
        model="veo-3.1-generate-preview",
        prompt=prompt,
    )
    # Poll the operation status until the video is ready.
    while not operation.done:
        print("Waiting for video generation to complete...")
        time.sleep(10)
        operation = client.operations.get(operation)

    # Download the video.
    video = operation.response.generated_videos[0]
    print(video)
    # extend the video
    operation_ext = client.models.generate_videos(
        model="veo-3.1-generate-preview",
        prompt="Extend the spooky atmosphere with more fog and eerie sounds.",
        video=video.video,
    )
    while not operation_ext.done:
        print("Waiting for video extension to complete...")
        time.sleep(10)
        operation_ext = client.operations.get(operation_ext)
    # save extended video
    video_ext = operation_ext.response.generated_videos[0]
    client.files.download(file=video_ext.video)  # pyright: ignore[reportArgumentType]
    video_ext.video.save("./tmp/extended_video.mp4")
    pass


async def poll_veo31_operation_and_get_video(op: GenerateVideosOperation):
    client = genai.Client(api_key=get_env_or_raise("GEMINI_API_KEY"))
    operation = client.operations.get(op)
    while not operation.done:
        print("Waiting for video generation to complete...")
        await asyncio.sleep(10)
        operation = client.operations.get(op)
    resp = operation.response
    if not resp or not resp.generated_videos:
        raise ValueError("No video generated.")
    generated_video: GeneratedVideo = resp.generated_videos[0]
    video = generated_video.video
    if not video:
        raise ValueError("No video found in the generated video.")
    return video


def save_video_to_path(video: Video, output_path: str):
    client = genai.Client(api_key=get_env_or_raise("GEMINI_API_KEY"))
    client.files.download(file=video)
    video.save(output_path)
    print(f"Generated video saved to {output_path}")
