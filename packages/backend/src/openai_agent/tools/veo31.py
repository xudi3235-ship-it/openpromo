import asyncio

from agents import function_tool
from google import genai
from google.genai.types import GeneratedVideo, Video
from google.genai.types import Image as GeminiImage

from src.core.shared import get_env_or_raise


@function_tool
async def run_gemini_veo31(
    prompt: str,
    output_path: str,
    prev_video_path: str = "NA",
    reference_images: list[str] = [],  # pyright: ignore[reportCallInDefaultInitializer]
):
    """powerful, single api for video generation and extension using Gemini VEO-3.1 model. this tool is capabale of text to video, images to video(with references), and video extension(using previous video as base). it runs, polls, and downloads the generated video.

    full doc: https://ai.google.dev/gemini-api/docs/video.md.txt

    Args:
        prompt: text prompt for video generation
        output_path: path to save the generated video
        prev_video_path: optional, previously generated video path to use as a base. this is used for video extension. default is "NA" which means no previous video.
        reference_images: list of image paths to use as reference images for chracter, product, style, etc. up to 3.
    """
    reference_images = reference_images or []
    if len(reference_images) > 3:
        raise ValueError("Maximum of 3 reference images are allowed.")

    reference_images_objs = [
        genai.types.VideoGenerationReferenceImage(
            image=GeminiImage.from_file(location=path)
        )
        for path in reference_images
    ]

    client = genai.Client(api_key=get_env_or_raise("GEMINI_API_KEY"))

    prev_video = (
        Video.from_file(location=prev_video_path) if prev_video_path != "NA" else None
    )

    operation = client.models.generate_videos(
        model="veo-3.1-generate-preview",
        prompt=prompt,
        video=prev_video,
        # https://ai.google.dev/gemini-api/docs/video?example=dialogue#veo-model-parameters
        config=genai.types.GenerateVideosConfig(
            reference_images=reference_images_objs,
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
