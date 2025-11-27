"""Replicate Nano Banana Pro provider implementation."""

from typing import Literal

from src.core.shared import get_env_or_raise
from src.sdks.replicate_sdk.client import ReplicateApi
from src.sdks.replicate_sdk.models.nano_banana import NanoBananaProInput

from .models import (
    AspectRatioType,
    ImageGenerationResult,
    ImageProvider,
    OutputFormatType,
    ResolutionType,
    UnifiedImageConfig,
)

# Type aliases matching Replicate's NanoBananaProInput
ReplicateAspectRatio = Literal["1:1", "2:3", "3:2", "3:4", "4:3", "9:16", "16:9"]
ReplicateResolution = Literal["1K", "2K", "4K"]
ReplicateOutputFormat = Literal["PNG", "JPG"]


def map_aspect_ratio_to_replicate(
    aspect_ratio: AspectRatioType,
) -> ReplicateAspectRatio:
    """Map unified aspect ratio to Replicate format."""
    # Filter out unsupported aspect ratios
    supported: dict[str, ReplicateAspectRatio] = {
        "1:1": "1:1",
        "2:3": "2:3",
        "3:2": "3:2",
        "3:4": "3:4",
        "4:3": "4:3",
        "9:16": "9:16",
        "16:9": "16:9",
    }
    return supported.get(aspect_ratio, "1:1")


def map_resolution_to_replicate(resolution: ResolutionType) -> ReplicateResolution:
    """Map unified resolution to Replicate format."""
    mapping: dict[str, ReplicateResolution] = {
        "1K": "1K",
        "2K": "2K",
        "4K": "4K",
    }
    return mapping.get(resolution, "2K")


def map_output_format_to_replicate(
    output_format: OutputFormatType,
) -> ReplicateOutputFormat:
    """Map unified output format to Replicate format."""
    mapping: dict[str, ReplicateOutputFormat] = {
        "PNG": "PNG",
        "JPG": "JPG",
    }
    return mapping.get(output_format, "PNG")


async def download_image(image_url: str, output_path: str) -> None:
    """Download image to local path."""
    import httpx

    async with httpx.AsyncClient() as http_client:
        response = await http_client.get(image_url, follow_redirects=True)
        response.raise_for_status()
        with open(output_path, "wb") as f:
            f.write(response.content)
    print(f"Generated image saved to {output_path}")


async def replicate_text_to_image(
    prompt: str,
    output_path: str,
    config: UnifiedImageConfig,
) -> ImageGenerationResult:
    """Generate image from text prompt using Replicate SDK."""
    try:
        client = ReplicateApi(api_token=get_env_or_raise("REPLICATE_API_TOKEN"))

        input_data = NanoBananaProInput(
            prompt=prompt,
            image_input=None,
            aspect_ratio=map_aspect_ratio_to_replicate(config.aspect_ratio),
            resolution=map_resolution_to_replicate(config.resolution),
            output_format=map_output_format_to_replicate(config.output_format),
            num_outputs=config.num_outputs,
        )

        result = client.run_nano_banana_pro(input_data)

        # Result is a FileOutput - get the URL
        image_url = str(result.url)
        image_urls = [image_url]

        if not image_url:
            raise ValueError("No image URL returned from Replicate")

        # Download the image to output_path
        await download_image(image_url, output_path)

        return ImageGenerationResult(
            status="success",
            message=f"Image generated and saved to {output_path}",
            output_path=output_path,
            image_url=image_url,
            image_urls=image_urls,
            provider=ImageProvider.REPLICATE,
        )
    except Exception as e:
        return ImageGenerationResult(
            status="error",
            message=f"Error in Replicate text-to-image: {e!s}",
            provider=ImageProvider.REPLICATE,
            error_type=type(e).__name__,
        )


async def replicate_transform_image(
    prompt: str,
    output_path: str,
    config: UnifiedImageConfig,
    image_paths: list[str],
) -> ImageGenerationResult:
    """Transform images using reference images with Replicate SDK."""
    try:
        client = ReplicateApi(api_token=get_env_or_raise("REPLICATE_API_TOKEN"))

        # For Replicate, image_input can be file paths or URLs
        # Replicate SDK handles local files automatically
        input_data = NanoBananaProInput(
            prompt=prompt,
            image_input=image_paths,  # Replicate accepts local paths
            aspect_ratio=map_aspect_ratio_to_replicate(config.aspect_ratio),
            resolution=map_resolution_to_replicate(config.resolution),
            output_format=map_output_format_to_replicate(config.output_format),
            num_outputs=config.num_outputs,
        )

        result = client.run_nano_banana_pro(input_data)

        # Result is a FileOutput - get the URL
        image_url = str(result.url)
        image_urls = [image_url]

        if not image_url:
            raise ValueError("No image URL returned from Replicate")

        # Download the image to output_path
        await download_image(image_url, output_path)

        return ImageGenerationResult(
            status="success",
            message=f"Image transformed and saved to {output_path}",
            output_path=output_path,
            image_url=image_url,
            image_urls=image_urls,
            provider=ImageProvider.REPLICATE,
        )
    except Exception as e:
        return ImageGenerationResult(
            status="error",
            message=f"Error in Replicate transform-image: {e!s}",
            provider=ImageProvider.REPLICATE,
            error_type=type(e).__name__,
        )
