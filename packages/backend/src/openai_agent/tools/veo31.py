import asyncio
from typing import Literal

from agents import function_tool
from google import genai
from google.genai.types import (
    GeneratedVideo,
    GenerateVideosOperation,
    GenerateVideosSource,
    Video,
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
    input_image_path: str | None = None,
    input_video_uri: str | None = None,
):
    """powerful, single api for video generation and extension using Gemini VEO-3.1 model. this tool is capabale of text to video, images to video(with references), and video extension(using previous video as base). it runs, polls, and downloads the generated video.
    full doc: https://ai.google.dev/gemini-api/docs/video.md.txt

    The following use cases are supported:
    1. Text to video generation.
    2a. Image to video generation (additional text prompt is optional).
    2b. Image to video generation with frame interpolation (specify last_frame
    in config).
    3. Video extension (additional text prompt is optional). ONLY supports video uri generated from veo3.1

    Args:
        prompt: text prompt for video generation
        output_path: path to save the generated video
        input_image_path: optional path to input image to guide video generation
        input_video_uri: optional uri to input video to extend, has to be the previously generated veo3.1 video uri.
    """
    print(
        f"Running Gemini VEO-3.1 with inputs: {prompt}, {input_image_path}, {input_video_uri}, {config}"
    )
    client = genai.Client(api_key=get_env_or_raise("GEMINI_API_KEY"))

    if input_image_path and input_video_uri:
        return {
            "status": "error",
            "message": "Please provide either input_image_path or input_video_uri, not both.",
        }

    input_video = (
        Video(uri=input_video_uri, mime_type="video/mp4")
        if input_video_uri is not None
        else None
    )

    input_image = (
        GeminiImage.from_file(location=input_image_path)
        if input_image_path is not None
        else None
    )

    # https://ai.google.dev/gemini-api/docs/video?example=dialogue#veo-model-parameters
    operation: GenerateVideosOperation = client.models.generate_videos(
        model="veo-3.1-generate-preview",
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
