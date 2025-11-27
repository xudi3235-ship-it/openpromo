"""Function tool wrappers for Sora 2 Pro Storyboard video generation."""

import logging
from typing import Literal

from agents import function_tool

from .models import (
    StoryboardAspectRatio,
    StoryboardConfig,
    StoryboardDuration,
    StoryboardShot,
)
from .provider_kie_ai import generate_storyboard_video

# Type aliases for parameters
AspectRatio = Literal["portrait", "landscape"]
Duration = Literal["10", "15", "25"]

logger = logging.getLogger(__name__)


@function_tool
async def sora2_storyboard_generate(
    shots: list[StoryboardShot],
    output_path: str,
    duration: Duration = "15",
    aspect_ratio: AspectRatio = "landscape",
    reference_image_paths: list[str] | None = None,
) -> dict[str, str | None]:
    """Generate a multi-scene storyboard video using Sora 2 Pro.

    This tool creates videos up to 25 seconds long by combining multiple scenes
    into a cohesive storyboard. Each scene has its own prompt and duration. shots dont have to be equal length, but total must not exceed duration param.

    Follow the same principles and guidelines for prompt generation as veo3.1 tools. Preferably use image gen tool to create image first, then use that along with the shots prompt to orchestrate the long video.


    Args:
        shots: List of scene dictionaries with 'scene' (description) and optional 'duration'(seconds).
               Example: [{"scene": "A cat eating cake", "duration": 7.5}, {"scene": "Cat licking lips"}]
        output_path: Path where the generated video will be saved.
        duration: Total video length - "10", "15", or "25" seconds (default: "15").
        aspect_ratio: Video aspect ratio - "portrait" or "landscape" (default: "landscape").
        reference_image_paths: optional start frame image for video.

    Returns:
        A dictionary with status, output_path/video_url on success, or error details on failure.

    Example:
        shots = [
            {"scene": "A fluffy orange cat sits at a table with a birthday cake", "duration": 7.5},
            {"scene": "The cat blows out the candles on the cake", "duration": 7.5}
        ]
        result = await sora2_storyboard_generate(shots, "./output.mp4", duration="15")
    """
    # Convert shot dicts to StoryboardShot objects

    if not shots:
        return {
            "status": "error",
            "message": "At least one shot is required",
            "error_type": "ValidationError",
        }
    logger.info(f">>> Preparing Sora 2 Pro Storyboard, shots: {shots}")
    # ensure the duration ads up to the total
    total_duration = sum(shot.duration for shot in shots)
    expected_duration = float(duration)
    if total_duration > expected_duration:
        return {
            "status": "error",
            "message": f"Total shot durations ({total_duration}s) exceed specified video duration ({expected_duration}s)",
            "error_type": "ValidationError",
        }

    config = StoryboardConfig(
        n_frames=StoryboardDuration(duration),
        aspect_ratio=StoryboardAspectRatio(aspect_ratio),
    )

    result = await generate_storyboard_video(
        shots=shots,
        output_path=output_path,
        config=config,
        reference_image_paths=reference_image_paths,
    )

    return result.model_dump()
