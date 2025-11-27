"""Unified router for Nano Banana Pro image generation."""

from .models import (
    GenerationMode,
    ImageGenerationResult,
    ImageProvider,
    UnifiedImageConfig,
)
from .provider_kie_ai import (
    kie_ai_text_to_image,
    kie_ai_transform_image,
)
from .provider_replicate import (
    replicate_text_to_image,
    replicate_transform_image,
)


async def generate_image(
    prompt: str,
    output_path: str,
    config: UnifiedImageConfig,
    provider: ImageProvider = ImageProvider.REPLICATE,
    generation_mode: GenerationMode = GenerationMode.TEXT_TO_IMAGE,
    # Optional params for transform mode
    image_paths: list[str] | None = None,
) -> dict[str, str | list[str] | None]:
    """Internal implementation of unified image generation."""
    print(
        f">>> Running Nano Banana Pro [{provider.value}] [{generation_mode.value}]: {prompt[:50]}..."
    )

    result: ImageGenerationResult

    if provider == ImageProvider.KIE_AI:
        if generation_mode == GenerationMode.TEXT_TO_IMAGE:
            result = await kie_ai_text_to_image(prompt, output_path, config)

        elif generation_mode == GenerationMode.TRANSFORM_IMAGE:
            if not image_paths:
                return {
                    "status": "error",
                    "message": "image_paths is required for transform_image mode",
                    "error_type": "ValidationError",
                }
            result = await kie_ai_transform_image(
                prompt, output_path, config, image_paths
            )

    elif provider == ImageProvider.REPLICATE:
        if generation_mode == GenerationMode.TEXT_TO_IMAGE:
            result = await replicate_text_to_image(prompt, output_path, config)

        elif generation_mode == GenerationMode.TRANSFORM_IMAGE:
            if not image_paths:
                return {
                    "status": "error",
                    "message": "image_paths is required for transform_image mode",
                    "error_type": "ValidationError",
                }
            result = await replicate_transform_image(
                prompt, output_path, config, image_paths
            )

    elif provider == ImageProvider.GOOGLE:
        # Google provider uses Replicate under the hood (same model)
        if generation_mode == GenerationMode.TEXT_TO_IMAGE:
            result = await replicate_text_to_image(prompt, output_path, config)

        elif generation_mode == GenerationMode.TRANSFORM_IMAGE:
            if not image_paths:
                return {
                    "status": "error",
                    "message": "image_paths is required for transform_image mode",
                    "error_type": "ValidationError",
                }
            result = await replicate_transform_image(
                prompt, output_path, config, image_paths
            )

    return result.model_dump()
