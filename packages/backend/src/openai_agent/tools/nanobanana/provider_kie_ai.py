"""Kie AI Nano Banana Pro provider implementation."""

import asyncio
import json

from src.core.shared import get_env_or_raise
from src.sdks.kie_ai_sdk import KieAIClient
from src.sdks.kie_ai_sdk.models import (
    NanoBananaAspectRatio,
    NanoBananaOutputFormat,
    NanoBananaResolution,
    TaskState,
)

from .models import (
    AspectRatioType,
    ImageGenerationResult,
    ImageProvider,
    OutputFormatType,
    ResolutionType,
    UnifiedImageConfig,
)


def map_aspect_ratio_to_kie(aspect_ratio: AspectRatioType) -> NanoBananaAspectRatio:
    """Map unified aspect ratio to Kie AI NanoBanana aspect ratio."""
    mapping: dict[str, NanoBananaAspectRatio] = {
        "1:1": NanoBananaAspectRatio.SQUARE,
        "2:3": NanoBananaAspectRatio.PORTRAIT_2_3,
        "3:2": NanoBananaAspectRatio.LANDSCAPE_3_2,
        "3:4": NanoBananaAspectRatio.PORTRAIT_3_4,
        "4:3": NanoBananaAspectRatio.LANDSCAPE_4_3,
        "4:5": NanoBananaAspectRatio.PORTRAIT_4_5,
        "5:4": NanoBananaAspectRatio.LANDSCAPE_5_4,
        "9:16": NanoBananaAspectRatio.PORTRAIT_9_16,
        "16:9": NanoBananaAspectRatio.LANDSCAPE_16_9,
        "21:9": NanoBananaAspectRatio.ULTRAWIDE,
    }
    return mapping.get(aspect_ratio, NanoBananaAspectRatio.SQUARE)


def map_resolution_to_kie(resolution: ResolutionType) -> NanoBananaResolution:
    """Map unified resolution to Kie AI NanoBanana resolution."""
    mapping: dict[str, NanoBananaResolution] = {
        "1K": NanoBananaResolution.ONE_K,
        "2K": NanoBananaResolution.TWO_K,
        "4K": NanoBananaResolution.FOUR_K,
    }
    return mapping.get(resolution, NanoBananaResolution.TWO_K)


def map_output_format_to_kie(
    output_format: OutputFormatType,
) -> NanoBananaOutputFormat:
    """Map unified output format to Kie AI NanoBanana output format."""
    mapping: dict[str, NanoBananaOutputFormat] = {
        "PNG": NanoBananaOutputFormat.PNG,
        "JPG": NanoBananaOutputFormat.JPG,
    }
    return mapping.get(output_format, NanoBananaOutputFormat.PNG)


def upload_images_to_kie_ai(client: KieAIClient, image_paths: list[str]) -> list[str]:
    """Upload local image files to Kie AI and return their URLs."""
    uploaded_urls: list[str] = []
    for path in image_paths:
        print(f"Uploading image to Kie AI: {path}")
        response = client.upload.upload_file_stream(
            file_path=path,
            upload_path="nanobanana/images",
        )
        if not response.data:
            raise ValueError(f"Failed to upload image: {path}")
        uploaded_urls.append(response.data.download_url)
        print(f"Uploaded: {path} -> {response.data.download_url}")
    return uploaded_urls


async def poll_kie_ai_task(client: KieAIClient, task_id: str) -> list[str]:
    """Poll Kie AI task until complete and return image URLs."""
    max_attempts = 60  # 5 minutes max for images
    for _ in range(max_attempts):
        details = client.jobs.get_task_details(task_id)
        if not details.data:
            raise ValueError("No details returned from Kie AI")

        state = details.data.state
        if state == TaskState.SUCCESS:
            # Parse result_json to get image URLs
            if details.data.result_json:
                result = json.loads(details.data.result_json)
                return result.get("resultUrls", [])
            raise ValueError("No result_json in successful response")
        elif state == TaskState.FAIL:
            error_msg = details.data.fail_msg or "Unknown error"
            raise ValueError(f"Image generation failed: {error_msg}")

        print("Waiting for Kie AI image generation to complete...")
        await asyncio.sleep(5)

    raise ValueError("Timeout waiting for image generation")


async def download_image(image_url: str, output_path: str) -> None:
    """Download image to local path."""
    import httpx

    async with httpx.AsyncClient() as http_client:
        response = await http_client.get(image_url, follow_redirects=True)
        response.raise_for_status()
        with open(output_path, "wb") as f:
            f.write(response.content)
    print(f"Generated image saved to {output_path}")


async def kie_ai_text_to_image(
    prompt: str,
    output_path: str,
    config: UnifiedImageConfig,
) -> ImageGenerationResult:
    """Generate image from text prompt using Kie AI SDK."""
    try:
        client = KieAIClient(api_key=get_env_or_raise("KIE_AI_API_KEY"))

        response = client.jobs.create_nanobanana_task(
            prompt=prompt,
            aspect_ratio=map_aspect_ratio_to_kie(config.aspect_ratio),
            resolution=map_resolution_to_kie(config.resolution),
            output_format=map_output_format_to_kie(config.output_format),
        )

        if not response.data:
            raise ValueError("No task ID returned from Kie AI")

        task_id = response.data.task_id
        image_urls = await poll_kie_ai_task(client, task_id)

        if not image_urls:
            raise ValueError("No image URLs returned")

        # Download the first image to output_path
        await download_image(image_urls[0], output_path)

        client.close()
        return ImageGenerationResult(
            status="success",
            message=f"Image generated and saved to {output_path}",
            output_path=output_path,
            image_url=image_urls[0],
            image_urls=image_urls,
            task_id=task_id,
            provider=ImageProvider.KIE_AI,
        )
    except Exception as e:
        return ImageGenerationResult(
            status="error",
            message=f"Error in Kie AI text-to-image: {e!s}",
            provider=ImageProvider.KIE_AI,
            error_type=type(e).__name__,
        )


async def kie_ai_transform_image(
    prompt: str,
    output_path: str,
    config: UnifiedImageConfig,
    image_paths: list[str],
) -> ImageGenerationResult:
    """Transform images using reference images with Kie AI SDK."""
    try:
        client = KieAIClient(api_key=get_env_or_raise("KIE_AI_API_KEY"))

        # Upload local images to Kie AI
        image_urls = upload_images_to_kie_ai(client, image_paths)

        response = client.jobs.create_nanobanana_task(
            prompt=prompt,
            image_input=image_urls,
            aspect_ratio=map_aspect_ratio_to_kie(config.aspect_ratio),
            resolution=map_resolution_to_kie(config.resolution),
            output_format=map_output_format_to_kie(config.output_format),
        )

        if not response.data:
            raise ValueError("No task ID returned from Kie AI")

        task_id = response.data.task_id
        result_urls = await poll_kie_ai_task(client, task_id)

        if not result_urls:
            raise ValueError("No image URLs returned")

        # Download the first image to output_path
        await download_image(result_urls[0], output_path)

        client.close()
        return ImageGenerationResult(
            status="success",
            message=f"Image transformed and saved to {output_path}",
            output_path=output_path,
            image_url=result_urls[0],
            image_urls=result_urls,
            task_id=task_id,
            provider=ImageProvider.KIE_AI,
        )
    except Exception as e:
        return ImageGenerationResult(
            status="error",
            message=f"Error in Kie AI transform-image: {e!s}",
            provider=ImageProvider.KIE_AI,
            error_type=type(e).__name__,
        )
