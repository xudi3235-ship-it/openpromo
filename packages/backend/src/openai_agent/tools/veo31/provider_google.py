"""Google Gemini Veo 3.1 provider implementation."""

import asyncio

from google import genai
from google.genai.types import (
    GeneratedVideo,
    GenerateVideosOperation,
    GenerateVideosSource,
    Video,
    VideoGenerationReferenceType,
)
from google.genai.types import Image as GeminiImage

from src.core.shared import get_env_or_raise

from .models import UnifiedConfigParams, VideoGenerationResult, VideoProvider


async def poll_google_operation(op: GenerateVideosOperation) -> Video:
    """Poll Google Veo operation until complete."""
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


def save_google_video(video: Video, output_path: str) -> None:
    """Save Google video to path."""
    client = genai.Client(api_key=get_env_or_raise("GEMINI_API_KEY"))
    client.files.download(file=video)
    video.save(output_path)
    print(f"Generated video saved to {output_path}")


async def google_text_to_video(
    prompt: str,
    output_path: str,
    config: UnifiedConfigParams,
) -> VideoGenerationResult:
    """Generate video using Google Gemini Veo 3.1."""
    try:
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
        video = await poll_google_operation(operation)
        save_google_video(video, output_path)
        return VideoGenerationResult(
            status="success",
            message=f"Video generated and saved to {output_path}",
            output_path=output_path,
            video_uri=video.uri,
            provider=VideoProvider.GOOGLE,
        )
    except Exception as e:
        return VideoGenerationResult(
            status="error",
            message=f"Error in Google text-to-video: {str(e)}",
            provider=VideoProvider.GOOGLE,
            error_type=type(e).__name__,
        )


async def google_image_to_video(
    prompt: str,
    output_path: str,
    config: UnifiedConfigParams,
    input_image_path: str,
    input_last_frame_path: str | None = None,
) -> VideoGenerationResult:
    """Generate video from image using Google Gemini Veo 3.1."""
    try:
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
        video = await poll_google_operation(operation)
        save_google_video(video, output_path)
        return VideoGenerationResult(
            status="success",
            message=f"Video generated and saved to {output_path}",
            output_path=output_path,
            video_uri=video.uri,
            provider=VideoProvider.GOOGLE,
        )
    except Exception as e:
        return VideoGenerationResult(
            status="error",
            message=f"Error in Google image-to-video: {str(e)}",
            provider=VideoProvider.GOOGLE,
            error_type=type(e).__name__,
        )


async def google_video_extension(
    prompt: str,
    output_path: str,
    config: UnifiedConfigParams,
    input_video_uri: str,
) -> VideoGenerationResult:
    """Extend video using Google Gemini Veo 3.1."""
    try:
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
        video = await poll_google_operation(operation)
        save_google_video(video, output_path)
        return VideoGenerationResult(
            status="success",
            message=f"Video extended and saved to {output_path}",
            output_path=output_path,
            video_uri=video.uri,
            provider=VideoProvider.GOOGLE,
        )
    except Exception as e:
        return VideoGenerationResult(
            status="error",
            message=f"Error in Google video extension: {str(e)}",
            provider=VideoProvider.GOOGLE,
            error_type=type(e).__name__,
        )


async def google_reference_images_to_video(
    prompt: str,
    output_path: str,
    config: UnifiedConfigParams,
    reference_images: list[str],
) -> VideoGenerationResult:
    """Generate video using reference images with Google Gemini Veo 3.1."""
    try:
        if config.aspect_ratio != "16:9":
            return VideoGenerationResult(
                status="error",
                message="When using reference_images, aspect_ratio must be set to 16:9.",
                provider=VideoProvider.GOOGLE,
                error_type="ValidationError",
            )

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
        video = await poll_google_operation(operation)
        save_google_video(video, output_path)
        return VideoGenerationResult(
            status="success",
            message=f"Video generated and saved to {output_path}",
            output_path=output_path,
            video_uri=video.uri,
            provider=VideoProvider.GOOGLE,
        )
    except Exception as e:
        return VideoGenerationResult(
            status="error",
            message=f"Error in Google reference-images-to-video: {str(e)}",
            provider=VideoProvider.GOOGLE,
            error_type=type(e).__name__,
        )
