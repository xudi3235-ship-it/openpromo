"""Function tool wrappers for Veo 3.1 video generation."""

from typing import Literal

from agents import function_tool

from .models import (
    GenerationMode,
    UnifiedConfigParams,
    VideoProvider,
)
from .router import generate_video

# Type aliases for parameters
Resolution = Literal["720p", "1080p"]
Duration = Literal[4, 6, 8]
AspectRatio = Literal["9:16", "16:9"]
Provider = Literal["google", "kie_ai"]


@function_tool
async def veo31_generate_video(
    prompt: str,
    output_path: str,
    provider: Provider = "kie_ai",
    generation_mode: str = "text_to_video",
    resolution: Resolution = "1080p",
    duration_seconds: Duration = 8,
    aspect_ratio: AspectRatio = "16:9",
    # Optional params for specific modes
    input_image_path: str | None = None,
    input_last_frame_path: str | None = None,
    input_video_uri: str | None = None,
    input_task_id: str | None = None,
    reference_images: list[str] | None = None,
    image_paths: list[str] | None = None,
    use_fast_model: bool = True,
) -> dict[str, str | None]:
    """Generate video using Veo 3.1 with unified interface.

    Args:
        prompt: The text prompt describing the video to generate.
        output_path: Path where the generated video will be saved.
        provider: Video generation provider - "google" or "kie_ai" (default: "kie_ai").
        generation_mode: Generation mode - "text_to_video", "image_to_video", "video_extension", or "reference_images".
        resolution: Video resolution - "720p" or "1080p" (default: "1080p").
        duration_seconds: Video duration in seconds - 4, 6, or 8 (default: 8).
        aspect_ratio: Video aspect ratio - "16:9" or "9:16" (default: "16:9").
        input_image_path: Path to input image for image_to_video mode.
        input_last_frame_path: Path to last frame image for image_to_video mode (Google only).
        input_video_uri: Google Cloud video URI for video_extension mode.
        input_task_id: Kie AI task ID for video_extension mode.
        reference_images: List of reference image URIs for Google reference_images mode.
        image_paths: List of local image paths for Kie AI (auto-uploaded).
        use_fast_model: Whether to use Kie AI's faster model (default: True).

    Returns:
        A dictionary with status, output_path/video_uri on success, or error details on failure.
    """
    video_provider = VideoProvider(provider)
    mode = GenerationMode(generation_mode)
    config = UnifiedConfigParams(
        resolution=resolution,
        duration_seconds=duration_seconds,
        aspect_ratio=aspect_ratio,
    )

    return await generate_video(
        prompt=prompt,
        output_path=output_path,
        config=config,
        provider=video_provider,
        generation_mode=mode,
        input_image_path=input_image_path,
        input_last_frame_path=input_last_frame_path,
        input_video_uri=input_video_uri,
        input_task_id=input_task_id,
        reference_images=reference_images,
        image_paths=image_paths,
        use_fast_model=use_fast_model,
    )


@function_tool
async def veo31_text_to_video(
    prompt: str,
    output_path: str,
    provider: Provider = "kie_ai",
    resolution: Resolution = "1080p",
    duration_seconds: Duration = 8,
    aspect_ratio: AspectRatio = "16:9",
    use_fast_model: bool = True,
) -> dict[str, str | None]:
    """Generate video from text prompt.

    Args:
        prompt: The text prompt describing the video to generate.
        output_path: Path where the generated video will be saved.
        provider: Video generation provider - "google" or "kie_ai" (default: "kie_ai").
        resolution: Video resolution - "720p" or "1080p" (default: "1080p").
        duration_seconds: Video duration in seconds - 4, 6, or 8 (default: 8).
        aspect_ratio: Video aspect ratio - "16:9" or "9:16" (default: "16:9").
        use_fast_model: Whether to use Kie AI's faster model (default: True).

    Returns:
        A dictionary with status and output_path/video_uri on success.
    """
    video_provider = VideoProvider(provider)
    config = UnifiedConfigParams(
        resolution=resolution,
        duration_seconds=duration_seconds,
        aspect_ratio=aspect_ratio,
    )

    return await generate_video(
        prompt=prompt,
        output_path=output_path,
        config=config,
        provider=video_provider,
        generation_mode=GenerationMode.TEXT_TO_VIDEO,
        use_fast_model=use_fast_model,
    )


@function_tool
async def veo31_image_to_video(
    prompt: str,
    output_path: str,
    provider: Provider = "kie_ai",
    input_image_path: str | None = None,
    input_last_frame_path: str | None = None,
    image_paths: list[str] | None = None,
    resolution: Resolution = "1080p",
    duration_seconds: Duration = 8,
    aspect_ratio: Literal["16:9"] = "16:9",
    use_fast_model: bool = True,
) -> dict[str, str | None]:
    """Generate video from image(s) with text prompt. Input images are used as start frame or end frame




    Args:
        prompt: The text prompt describing the video to generate.
        output_path: Path where the generated video will be saved.
        provider: Video generation provider - "google" or "kie_ai" (default: "kie_ai").
        input_image_path: Path to input image (required for Google provider).
        input_last_frame_path: Path to last frame image (Google only).
        image_paths: List of local image paths (required for Kie AI, auto-uploaded). Could be up to 2 img, first as start frame, second as end frame.
        resolution: Video resolution - "720p" or "1080p" (default: "1080p").
        duration_seconds: Video duration in seconds - 4, 6, or 8 (default: 8).
        aspect_ratio: Video aspect ratio - "16:9" or "9:16" (default: "16:9").
        use_fast_model: Whether to use Kie AI's faster model (default: True).

    Returns:
        A dictionary with status and output_path/video_uri on success.
    """
    video_provider = VideoProvider(provider)
    config = UnifiedConfigParams(
        resolution=resolution,
        duration_seconds=duration_seconds,
        aspect_ratio=aspect_ratio,
    )

    return await generate_video(
        prompt=prompt,
        output_path=output_path,
        config=config,
        provider=video_provider,
        generation_mode=GenerationMode.IMAGE_TO_VIDEO,
        input_image_path=input_image_path,
        input_last_frame_path=input_last_frame_path,
        image_paths=image_paths,
        use_fast_model=use_fast_model,
    )


@function_tool
async def veo31_video_extension(
    prompt: str,
    output_path: str,
    provider: Provider = "kie_ai",
    input_video_uri: str | None = None,
    input_task_id: str | None = None,
    resolution: Resolution = "1080p",
    aspect_ratio: AspectRatio = "16:9",
) -> dict[str, str | None]:
    """Extend an existing video with new content.

    Args:
        prompt: The text prompt describing how to extend the video.
        output_path: Path where the extended video will be saved.
        provider: Video generation provider - "google" or "kie_ai" (default: "kie_ai").
        input_video_uri: Google Cloud video URI to extend (required for Google).
        input_task_id: Kie AI task ID to extend (required for Kie AI).
        resolution: Video resolution - "720p" or "1080p" (default: "1080p").
        aspect_ratio: Video aspect ratio - "16:9" or "9:16" (default: "16:9").

    Returns:
        A dictionary with status and output_path/video_uri on success.
    """
    video_provider = VideoProvider(provider)
    config = UnifiedConfigParams(
        resolution=resolution,
        aspect_ratio=aspect_ratio,
    )

    return await generate_video(
        prompt=prompt,
        output_path=output_path,
        config=config,
        provider=video_provider,
        generation_mode=GenerationMode.VIDEO_EXTENSION,
        input_video_uri=input_video_uri,
        input_task_id=input_task_id,
    )


@function_tool
async def veo31_reference_images_to_video(
    prompt: str,
    output_path: str,
    provider: Provider = "kie_ai",
    reference_images: list[str] | None = None,
    image_paths: list[str] | None = None,
    resolution: Resolution = "1080p",
    duration_seconds: Duration = 8,
    aspect_ratio: AspectRatio = "16:9",
    use_fast_model: bool = True,
) -> dict[str, str | None]:
    """Generate video using reference images for style/subject.

    Limitations:
        - only works for 16:9 aspect ratio!

    Args:
        prompt: The text prompt describing the video to generate.
        output_path: Path where the generated video will be saved.
        provider: Video generation provider - "google" or "kie_ai" (default: "kie_ai").
        reference_images: List of reference image URIs (required for Google).
        image_paths: List of local image paths (required for Kie AI, auto-uploaded).
        resolution: Video resolution - "720p" or "1080p" (default: "1080p").
        duration_seconds: Video duration in seconds - 4, 6, or 8 (default: 8).
        aspect_ratio: Video aspect ratio - "16:9" or "9:16" (default: "16:9").
        use_fast_model: Whether to use Kie AI's faster model (default: True).

    Returns:
        A dictionary with status and output_path/video_uri on success.
    """
    video_provider = VideoProvider(provider)
    config = UnifiedConfigParams(
        resolution=resolution,
        duration_seconds=duration_seconds,
        aspect_ratio=aspect_ratio,
    )

    return await generate_video(
        prompt=prompt,
        output_path=output_path,
        config=config,
        provider=video_provider,
        generation_mode=GenerationMode.REFERENCE_IMAGES,
        reference_images=reference_images,
        image_paths=image_paths,
        use_fast_model=use_fast_model,
    )
