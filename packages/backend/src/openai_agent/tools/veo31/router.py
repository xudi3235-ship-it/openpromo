"""Unified router for Veo 3.1 video generation."""

from .models import (
    GenerationMode,
    UnifiedConfigParams,
    VideoGenerationResult,
    VideoProvider,
)
from .provider_google import (
    google_image_to_video,
    google_reference_images_to_video,
    google_text_to_video,
    google_video_extension,
)
from .provider_kie_ai import (
    kie_ai_image_to_video,
    kie_ai_reference_to_video,
    kie_ai_text_to_video,
    kie_ai_video_extension,
)


async def generate_video(
    prompt: str,
    output_path: str,
    config: UnifiedConfigParams,
    provider: VideoProvider = VideoProvider.KIE_AI,
    generation_mode: GenerationMode = GenerationMode.TEXT_TO_VIDEO,
    # Optional params for specific modes
    input_image_path: str | None = None,
    input_last_frame_path: str | None = None,
    input_video_uri: str | None = None,  # Google video URI for extension
    input_task_id: str | None = None,  # Kie AI task ID for extension
    reference_images: list[str] | None = None,  # For Google reference images
    image_paths: list[str] | None = None,  # For Kie AI (local file paths, auto-uploaded)
    use_fast_model: bool = True,  # For Kie AI
) -> dict[str, str | None]:
    """Internal implementation of unified video generation."""
    print(
        f">>> Running Veo 3.1 [{provider.value}] [{generation_mode.value}]: {prompt[:50]}..."
    )

    result: VideoGenerationResult

    if provider == VideoProvider.GOOGLE:
        if generation_mode == GenerationMode.TEXT_TO_VIDEO:
            result = await google_text_to_video(prompt, output_path, config)

        elif generation_mode == GenerationMode.IMAGE_TO_VIDEO:
            if not input_image_path:
                return {
                    "status": "error",
                    "message": "input_image_path is required for image_to_video mode with Google provider",
                    "error_type": "ValidationError",
                }
            result = await google_image_to_video(
                prompt, output_path, config, input_image_path, input_last_frame_path
            )

        elif generation_mode == GenerationMode.VIDEO_EXTENSION:
            if not input_video_uri:
                return {
                    "status": "error",
                    "message": "input_video_uri is required for video_extension mode with Google provider",
                    "error_type": "ValidationError",
                }
            result = await google_video_extension(
                prompt, output_path, config, input_video_uri
            )

        elif generation_mode == GenerationMode.REFERENCE_IMAGES:
            if not reference_images:
                return {
                    "status": "error",
                    "message": "reference_images is required for reference_images mode",
                    "error_type": "ValidationError",
                }
            result = await google_reference_images_to_video(
                prompt, output_path, config, reference_images
            )

    elif provider == VideoProvider.KIE_AI:
        if generation_mode == GenerationMode.TEXT_TO_VIDEO:
            result = await kie_ai_text_to_video(
                prompt, output_path, config, use_fast_model
            )

        elif generation_mode == GenerationMode.IMAGE_TO_VIDEO:
            if not image_paths:
                return {
                    "status": "error",
                    "message": "image_paths is required for image_to_video mode with Kie AI provider",
                    "error_type": "ValidationError",
                }
            result = await kie_ai_image_to_video(
                prompt, output_path, config, image_paths, use_fast_model
            )

        elif generation_mode == GenerationMode.VIDEO_EXTENSION:
            if not input_task_id:
                return {
                    "status": "error",
                    "message": "input_task_id is required for video_extension mode with Kie AI provider",
                    "error_type": "ValidationError",
                }
            result = await kie_ai_video_extension(prompt, output_path, input_task_id)

        elif generation_mode == GenerationMode.REFERENCE_IMAGES:
            if not image_paths:
                return {
                    "status": "error",
                    "message": "image_paths is required for reference_images mode with Kie AI provider",
                    "error_type": "ValidationError",
                }
            result = await kie_ai_reference_to_video(
                prompt, output_path, config, image_paths, use_fast_model
            )

    return result.model_dump()
