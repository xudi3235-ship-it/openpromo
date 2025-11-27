"""Function tool wrappers for Nano Banana Pro image generation."""

from typing import Literal

from agents import function_tool

from .models import (
    GenerationMode,
    ImageProvider,
    UnifiedImageConfig,
)
from .router import generate_image

# Type aliases for parameters
Provider = Literal["google", "kie_ai", "replicate"]
AspectRatio = Literal[
    "1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9", "21:9"
]
Resolution = Literal["1K", "2K", "4K"]
OutputFormat = Literal["PNG", "JPG"]


@function_tool
async def nanobanana_generate_image(
    prompt: str,
    output_path: str,
    provider: Provider = "replicate",
    generation_mode: str = "text_to_image",
    aspect_ratio: AspectRatio = "1:1",
    resolution: Resolution = "2K",
    output_format: OutputFormat = "PNG",
    num_outputs: int = 1,
    # Optional params for transform mode
    image_paths: list[str] | None = None,
) -> dict[str, str | list[str] | None]:
    """Generate image using Nano Banana Pro with unified interface.

    Args:
        prompt: The text prompt describing the image to generate.
        output_path: Path where the generated image will be saved.
        provider: Image generation provider - "google", "kie_ai", or "replicate" (default: "replicate").
        generation_mode: Generation mode - "text_to_image" or "transform_image".
        aspect_ratio: Image aspect ratio (default: "1:1").
        resolution: Image resolution - "1K", "2K", or "4K" (default: "2K").
        output_format: Output format - "PNG" or "JPG" (default: "PNG").
        num_outputs: Number of images to generate (default: 1).
        image_paths: List of local image paths for transform_image mode (auto-uploaded for Kie AI).

    Returns:
        A dictionary with status, output_path/image_url on success, or error details on failure.
    """
    image_provider = ImageProvider(provider)
    mode = GenerationMode(generation_mode)
    config = UnifiedImageConfig(
        aspect_ratio=aspect_ratio,
        resolution=resolution,
        output_format=output_format,
        num_outputs=num_outputs,
    )

    return await generate_image(
        prompt=prompt,
        output_path=output_path,
        config=config,
        provider=image_provider,
        generation_mode=mode,
        image_paths=image_paths,
    )


@function_tool
async def nanobanana_text_to_image(
    prompt: str,
    output_path: str,
    provider: Provider = "replicate",
    aspect_ratio: AspectRatio = "1:1",
    resolution: Resolution = "2K",
    output_format: OutputFormat = "PNG",
    num_outputs: int = 1,
) -> dict[str, str | list[str] | None]:
    """Generate image from text prompt using Nano Banana Pro.

    Args:
        prompt: The text prompt describing the image to generate.
        output_path: Path where the generated image will be saved.
        provider: Image generation provider - "google", "kie_ai", or "replicate" (default: "replicate").
        aspect_ratio: Image aspect ratio (default: "1:1").
        resolution: Image resolution - "1K", "2K", or "4K" (default: "2K").
        output_format: Output format - "PNG" or "JPG" (default: "PNG").
        num_outputs: Number of images to generate (default: 1).

    Returns:
        A dictionary with status and output_path/image_url on success.
    """
    image_provider = ImageProvider(provider)
    config = UnifiedImageConfig(
        aspect_ratio=aspect_ratio,
        resolution=resolution,
        output_format=output_format,
        num_outputs=num_outputs,
    )

    return await generate_image(
        prompt=prompt,
        output_path=output_path,
        config=config,
        provider=image_provider,
        generation_mode=GenerationMode.TEXT_TO_IMAGE,
    )


@function_tool
async def nanobanana_transform_image(
    prompt: str,
    output_path: str,
    image_paths: list[str],
    provider: Provider = "replicate",
    aspect_ratio: AspectRatio = "1:1",
    resolution: Resolution = "2K",
    output_format: OutputFormat = "PNG",
    num_outputs: int = 1,
) -> dict[str, str | list[str] | None]:
    """Transform/generate image using reference images with Nano Banana Pro.

    Args:
        prompt: The text prompt describing the transformation or generation.
        output_path: Path where the generated image will be saved.
        image_paths: List of local image paths to use as reference (up to 14 for Replicate, 8 for Kie AI).
        provider: Image generation provider - "google", "kie_ai", or "replicate" (default: "replicate").
        aspect_ratio: Image aspect ratio (default: "1:1").
        resolution: Image resolution - "1K", "2K", or "4K" (default: "2K").
        output_format: Output format - "PNG" or "JPG" (default: "PNG").
        num_outputs: Number of images to generate (default: 1).

    Returns:
        A dictionary with status and output_path/image_url on success.
    """
    image_provider = ImageProvider(provider)
    config = UnifiedImageConfig(
        aspect_ratio=aspect_ratio,
        resolution=resolution,
        output_format=output_format,
        num_outputs=num_outputs,
    )

    return await generate_image(
        prompt=prompt,
        output_path=output_path,
        config=config,
        provider=image_provider,
        generation_mode=GenerationMode.TRANSFORM_IMAGE,
        image_paths=image_paths,
    )
