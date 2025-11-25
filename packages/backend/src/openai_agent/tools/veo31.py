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
async def veo31_text_to_video(
    prompt: str,
    output_path: str,
    config: ConfigParams,
):
    """Generate a video from a text prompt using Gemini VEO-3.1.

    Args:
        prompt: text prompt for video generation
        output_path: path to save the generated video
        config: configuration parameters for the video
    """
    try:
        print(f">>> Running Gemini VEO-3.1 Text-to-Video: {prompt}, {config}")
        MODEL_ID = "veo-3.1-generate-preview"
        client = genai.Client(api_key=get_env_or_raise("GEMINI_API_KEY"))

        operation = client.models.generate_videos(
            model=MODEL_ID,
            source=GenerateVideosSource(prompt=prompt),
            config=genai.types.GenerateVideosConfig(
                number_of_videos=config.number_of_videos,
                duration_seconds=config.duration_seconds,
                resolution=config.resolution,
                aspect_ratio=config.aspect_ratio,
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
    except Exception as e:
        error_msg = f"Error in veo31_text_to_video: {str(e)}"
        print(error_msg)
        return {
            "status": "error",
            "message": error_msg,
            "error_type": type(e).__name__,
        }


@function_tool
async def veo31_image_to_video(
    prompt: str,
    output_path: str,
    input_image_path: str,
    config: ConfigParams,
    input_last_frame_path: str | None = None,
):
    """Generate a video from an image (and optional last frame) using Gemini VEO-3.1.

    Args:
        prompt: text prompt for video generation
        output_path: path to save the generated video
        input_image_path: image that used as first frame to guide generation.
        config: configuration parameters for the video
        input_last_frame_path: optional path to input last frame image for frame interpolation.
    """
    try:
        print(
            f">>> Running Gemini VEO-3.1 Image-to-Video: {prompt}, {input_image_path}, {config}"
        )
        MODEL_ID = "veo-3.1-generate-preview"
        client = genai.Client(api_key=get_env_or_raise("GEMINI_API_KEY"))

        input_image = GeminiImage.from_file(location=input_image_path)
        input_last_frame = (
            GeminiImage.from_file(location=input_last_frame_path)
            if input_last_frame_path
            else None
        )

        operation = client.models.generate_videos(
            model=MODEL_ID,
            source=GenerateVideosSource(
                prompt=prompt,
                image=input_image,
            ),
            config=genai.types.GenerateVideosConfig(
                number_of_videos=config.number_of_videos,
                duration_seconds=config.duration_seconds,
                resolution=config.resolution,
                aspect_ratio=config.aspect_ratio,
                last_frame=input_last_frame,
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
    except Exception as e:
        error_msg = f"Error in veo31_image_to_video: {str(e)}"
        print(error_msg)
        return {
            "status": "error",
            "message": error_msg,
            "error_type": type(e).__name__,
        }


@function_tool
async def veo31_video_extension(
    prompt: str,
    output_path: str,
    input_video_uri: str,
    config: ConfigParams,
):
    """Extend an existing Gemini VEO-3.1 video.

    Args:
        prompt: text prompt for video extension
        output_path: path to save the generated video
        input_video_uri: uri to input video to extend, has to be the previously generated veo3.1 video uri.
        config: configuration parameters for the video
    """
    try:
        print(
            f">>> Running Gemini VEO-3.1 Video Extension: {prompt}, {input_video_uri}, {config}"
        )
        MODEL_ID = "veo-3.1-generate-preview"
        client = genai.Client(api_key=get_env_or_raise("GEMINI_API_KEY"))

        input_video = Video(uri=input_video_uri)

        operation = client.models.generate_videos(
            model=MODEL_ID,
            source=GenerateVideosSource(
                prompt=prompt,
                video=input_video,
            ),
            config=genai.types.GenerateVideosConfig(
                number_of_videos=config.number_of_videos,
                duration_seconds=config.duration_seconds,
                resolution=config.resolution,
                aspect_ratio=config.aspect_ratio,
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
    except Exception as e:
        error_msg = f"Error in veo31_video_extension: {str(e)}"
        print(error_msg)
        return {
            "status": "error",
            "message": error_msg,
            "error_type": type(e).__name__,
        }


@function_tool
async def veo31_reference_images_to_video(
    prompt: str,
    output_path: str,
    reference_images: list[str],
    config: ConfigParams,
):
    """Generate a video using reference images (assets) using Gemini VEO-3.1.
    Use this to do "ingredients to video" generation, for strong consistency. Only works for aspect ratio 16:9.

    Args:
        prompt: text prompt for video generation
        output_path: path to save the generated video
        reference_images: list of paths to reference images to guide video generation.
        config: configuration parameters for the video. CRITICAL: aspect_ratio must be 16:9.
    """
    try:
        print(
            f">>> Running Gemini VEO-3.1 Reference-Images-to-Video: {prompt}, {reference_images}, {config}"
        )

        if config.aspect_ratio != "16:9":
            return {
                "status": "error",
                "message": "When using reference_images, aspect_ratio must be set to 16:9.",
                "error_type": "ValidationError",
            }

        MODEL_ID = "veo-3.1-generate-preview"
        client = genai.Client(api_key=get_env_or_raise("GEMINI_API_KEY"))

        ref_imgs = [
            GeminiImage.from_file(location=img_path) for img_path in reference_images
        ]

        ref_imgs_obj = [
            genai.types.VideoGenerationReferenceImage(
                image=img,
                reference_type=VideoGenerationReferenceType.ASSET,
            )
            for img in ref_imgs
        ]

        operation = client.models.generate_videos(
            model=MODEL_ID,
            source=GenerateVideosSource(prompt=prompt),
            config=genai.types.GenerateVideosConfig(
                number_of_videos=config.number_of_videos,
                duration_seconds=config.duration_seconds,
                resolution=config.resolution,
                aspect_ratio=config.aspect_ratio,
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
    except Exception as e:
        error_msg = f"Error in veo31_reference_images_to_video: {str(e)}"
        print(error_msg)
        return {
            "status": "error",
            "message": error_msg,
            "error_type": type(e).__name__,
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
    if not resp:
        raise ValueError("No response from video generation operation.")
    if resp.rai_media_filtered_count:
        reason = resp.rai_media_filtered_reasons
        exception_msg = (
            f"Video generation failed due to RAI filtering. "
            f"Filtered count: {resp.rai_media_filtered_count}, Reasons: {reason}"
        )
        raise ValueError(exception_msg)
    if not resp.generated_videos:
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
