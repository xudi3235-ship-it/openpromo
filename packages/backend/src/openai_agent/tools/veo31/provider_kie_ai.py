"""Kie AI Veo 3.1 provider implementation."""

import asyncio

from src.core.shared import get_env_or_raise
from src.sdks.kie_ai_sdk import KieAIClient
from src.sdks.kie_ai_sdk.models import (
    AspectRatio as KieAspectRatio,
)
from src.sdks.kie_ai_sdk.models import (
    GenerationType as KieGenerationType,
)
from src.sdks.kie_ai_sdk.models import (
    Model as KieModel,
)
from src.sdks.kie_ai_sdk.models import (
    TaskStatus,
)

from .models import UnifiedConfigParams, VideoGenerationResult, VideoProvider


def map_aspect_ratio_to_kie(aspect_ratio: str) -> KieAspectRatio:
    """Map unified aspect ratio to Kie AI aspect ratio."""
    mapping = {
        "16:9": KieAspectRatio.LANDSCAPE,
        "9:16": KieAspectRatio.PORTRAIT,
    }
    return mapping.get(aspect_ratio, KieAspectRatio.PORTRAIT)


def upload_images_to_kie_ai(client: KieAIClient, image_paths: list[str]) -> list[str]:
    """Upload local image files to Kie AI and return their URLs."""
    uploaded_urls: list[str] = []
    for path in image_paths:
        print(f"Uploading image to Kie AI: {path}")
        response = client.upload.upload_file_stream(
            file_path=path,
            upload_path="veo31/images",
        )
        if not response.data:
            raise ValueError(f"Failed to upload image: {path}")
        uploaded_urls.append(response.data.download_url)
        print(f"Uploaded: {path} -> {response.data.download_url}")
    return uploaded_urls


async def poll_kie_ai_task(client: KieAIClient, task_id: str) -> str:
    """Poll Kie AI task until complete and return video URL."""
    max_attempts = 120  # 20 minutes max
    for _ in range(max_attempts):
        details = client.veo.get_video_details(task_id)
        if not details.data:
            raise ValueError("No details returned from Kie AI")

        status = details.data.success_flag
        if status == TaskStatus.SUCCESS:
            if details.data.response and details.data.response.result_urls:
                return details.data.response.result_urls[0]
            raise ValueError("No video URL in successful response")
        elif status in (TaskStatus.FAILED, TaskStatus.GENERATION_FAILED):
            error_msg = details.data.error_message or "Unknown error"
            raise ValueError(f"Video generation failed: {error_msg}")

        print("Waiting for Kie AI video generation to complete...")
        await asyncio.sleep(10)

    raise ValueError("Timeout waiting for video generation")


async def download_kie_ai_video(
    client: KieAIClient, video_url: str, output_path: str
) -> None:
    """Download Kie AI video to local path."""
    import httpx

    # Get the actual download URL
    actual_url = client.common.get_download_url(video_url)

    # Download the video
    async with httpx.AsyncClient() as http_client:
        response = await http_client.get(actual_url, follow_redirects=True)
        response.raise_for_status()
        with open(output_path, "wb") as f:
            f.write(response.content)
    print(f"Generated video saved to {output_path}")


async def kie_ai_text_to_video(
    prompt: str,
    output_path: str,
    config: UnifiedConfigParams,
    use_fast_model: bool = True,
) -> VideoGenerationResult:
    """Generate video using Kie AI SDK."""
    try:
        client = KieAIClient(api_key=get_env_or_raise("KIE_AI_API_KEY"))
        model = KieModel.VEO3_FAST if use_fast_model else KieModel.VEO3

        response = client.veo.generate_video(
            prompt=prompt,
            model=model,
            generation_type=KieGenerationType.TEXT_2_VIDEO,
            aspect_ratio=map_aspect_ratio_to_kie(config.aspect_ratio),
        )

        if not response.data:
            raise ValueError("No task ID returned from Kie AI")

        task_id = response.data.task_id
        video_url = await poll_kie_ai_task(client, task_id)

        # Download the video to output_path
        await download_kie_ai_video(client, video_url, output_path)

        client.close()
        return VideoGenerationResult(
            status="success",
            message=f"Video generated and saved to {output_path}",
            output_path=output_path,
            task_id=task_id,
            provider=VideoProvider.KIE_AI,
        )
    except Exception as e:
        return VideoGenerationResult(
            status="error",
            message=f"Error in Kie AI text-to-video: {str(e)}",
            provider=VideoProvider.KIE_AI,
            error_type=type(e).__name__,
        )


async def kie_ai_image_to_video(
    prompt: str,
    output_path: str,
    config: UnifiedConfigParams,
    image_paths: list[str],
    use_fast_model: bool = True,
) -> VideoGenerationResult:
    """Generate video from images using Kie AI SDK."""
    try:
        client = KieAIClient(api_key=get_env_or_raise("KIE_AI_API_KEY"))
        model = KieModel.VEO3_FAST if use_fast_model else KieModel.VEO3

        # Upload local images to Kie AI
        image_urls = upload_images_to_kie_ai(client, image_paths)

        # Use FIRST_AND_LAST_FRAMES_2_VIDEO if 2 images, otherwise auto-detect
        generation_type = (
            KieGenerationType.FIRST_AND_LAST_FRAMES_2_VIDEO
            if len(image_urls) == 2
            else None  # Let API auto-detect for single image
        )

        response = client.veo.generate_video(
            prompt=prompt,
            image_urls=image_urls,
            model=model,
            generation_type=generation_type,
            aspect_ratio=map_aspect_ratio_to_kie(config.aspect_ratio),
        )

        if not response.data:
            raise ValueError("No task ID returned from Kie AI")

        task_id = response.data.task_id
        video_url = await poll_kie_ai_task(client, task_id)
        await download_kie_ai_video(client, video_url, output_path)

        client.close()
        return VideoGenerationResult(
            status="success",
            message=f"Video generated and saved to {output_path}",
            output_path=output_path,
            task_id=task_id,
            provider=VideoProvider.KIE_AI,
        )
    except Exception as e:
        return VideoGenerationResult(
            status="error",
            message=f"Error in Kie AI image-to-video: {str(e)}",
            provider=VideoProvider.KIE_AI,
            error_type=type(e).__name__,
        )


async def kie_ai_video_extension(
    prompt: str,
    output_path: str,
    input_task_id: str,
) -> VideoGenerationResult:
    """Extend video using Kie AI SDK."""
    try:
        client = KieAIClient(api_key=get_env_or_raise("KIE_AI_API_KEY"))

        response = client.veo.extend_video(
            task_id=input_task_id,
            prompt=prompt,
        )

        if not response.data:
            raise ValueError("No task ID returned from Kie AI")

        task_id = response.data.task_id
        video_url = await poll_kie_ai_task(client, task_id)
        await download_kie_ai_video(client, video_url, output_path)

        client.close()
        return VideoGenerationResult(
            status="success",
            message=f"Video extended and saved to {output_path}",
            output_path=output_path,
            task_id=task_id,
            provider=VideoProvider.KIE_AI,
        )
    except Exception as e:
        return VideoGenerationResult(
            status="error",
            message=f"Error in Kie AI video extension: {str(e)}",
            provider=VideoProvider.KIE_AI,
            error_type=type(e).__name__,
        )


async def kie_ai_reference_to_video(
    prompt: str,
    output_path: str,
    config: UnifiedConfigParams,
    image_paths: list[str],
    use_fast_model: bool = True,
) -> VideoGenerationResult:
    """Generate video using reference images with Kie AI SDK."""
    try:
        client = KieAIClient(api_key=get_env_or_raise("KIE_AI_API_KEY"))
        model = KieModel.VEO3_FAST if use_fast_model else KieModel.VEO3

        # Upload local images to Kie AI
        image_urls = upload_images_to_kie_ai(client, image_paths)

        response = client.veo.generate_video(
            prompt=prompt,
            image_urls=image_urls,
            model=model,
            generation_type=KieGenerationType.REFERENCE_2_VIDEO,
            aspect_ratio=map_aspect_ratio_to_kie(config.aspect_ratio),
        )

        if not response.data:
            raise ValueError("No task ID returned from Kie AI")

        task_id = response.data.task_id
        video_url = await poll_kie_ai_task(client, task_id)
        await download_kie_ai_video(client, video_url, output_path)

        client.close()
        return VideoGenerationResult(
            status="success",
            message=f"Video generated and saved to {output_path}",
            output_path=output_path,
            task_id=task_id,
            provider=VideoProvider.KIE_AI,
        )
    except Exception as e:
        return VideoGenerationResult(
            status="error",
            message=f"Error in Kie AI reference-to-video: {str(e)}",
            provider=VideoProvider.KIE_AI,
            error_type=type(e).__name__,
        )
