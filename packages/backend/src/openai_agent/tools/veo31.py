import asyncio

from agents import function_tool
from google import genai
from google.genai.types import GeneratedVideo, GenerateVideosSource, Video
from google.genai.types import Image as GeminiImage

from src.core.shared import get_env_or_raise


@function_tool
async def run_gemini_veo31(
    prompt: str,
    output_path: str,
    input_image_path: str | None = None,
    input_video_path: str | None = None,
):
    """powerful, single api for video generation and extension using Gemini VEO-3.1 model. this tool is capabale of text to video, images to video(with references), and video extension(using previous video as base). it runs, polls, and downloads the generated video.

    full doc: https://ai.google.dev/gemini-api/docs/video.md.txt

    The following use cases are supported:
    1. Text to video generation.
    2a. Image to video generation (additional text prompt is optional).
    2b. Image to video generation with frame interpolation (specify last_frame
    in config).
    3. Video extension (additional text prompt is optional)



    Args:
        prompt: text prompt for video generation
        output_path: path to save the generated video
        input_image_path: optional path to input image to guide video generation
        input_video_path: optional path to input video to extend
    """
    client = genai.Client(api_key=get_env_or_raise("GEMINI_API_KEY"))

    input_video = (
        Video.from_file(location=input_video_path)
        if input_video_path is not None
        else None
    )
    input_image = (
        GeminiImage.from_file(location=input_image_path)
        if input_image_path is not None
        else None
    )

    # https://ai.google.dev/gemini-api/docs/video?example=dialogue#veo-model-parameters
    operation = client.models.generate_videos(
        model="veo-3.1-generate-preview",
        source=GenerateVideosSource(
            prompt=prompt,
            image=input_image,
            video=input_video,
        ),
        config=genai.types.GenerateVideosConfig(
            number_of_videos=1,
            duration_seconds=8,
            resolution="720p",
            aspect_ratio="9:16",
        ),
    )
    # poll until done
    while not operation.done:
        print("Waiting for video generation to complete...")
        await asyncio.sleep(10)
        operation = client.operations.get(operation)
    # download the video
    resp = operation.response
    if not resp or not resp.generated_videos:
        raise ValueError("No video generated.")
    generated_video: GeneratedVideo = resp.generated_videos[0]
    video = generated_video.video
    if not video:
        raise ValueError("No video found in the generated video.")

    client.files.download(file=video)
    video.save(output_path)
    print(f"Generated video saved to {output_path}")
    return {
        "status": "success",
        "message": f"Video generated and saved to {output_path}",
        "output_path": output_path,
    }
