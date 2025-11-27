"""Data models and enums for Veo 3.1 unified interface."""

from enum import Enum
from typing import Literal

from pydantic import BaseModel, Field


class VideoProvider(str, Enum):
    """Video generation provider options."""

    GOOGLE = "google"  # Google Gemini Veo 3.1 (direct API)
    KIE_AI = "kie_ai"  # Kie AI (cheaper, higher rate limit)


class GenerationMode(str, Enum):
    """Video generation mode options."""

    TEXT_TO_VIDEO = "text_to_video"
    IMAGE_TO_VIDEO = "image_to_video"
    VIDEO_EXTENSION = "video_extension"
    REFERENCE_IMAGES = "reference_images"  # For "ingredients to video" generation


class UnifiedConfigParams(BaseModel):
    """Unified configuration parameters for video generation."""

    resolution: Literal["720p", "1080p"] = Field(
        default="720p", description="Resolution of the generated video"
    )
    number_of_videos: int = Field(
        default=1, description="Number of videos to generate, only set to 1"
    )
    duration_seconds: Literal[4, 6, 8] = Field(
        default=8, description="Duration of the generated video in seconds"
    )
    aspect_ratio: Literal["9:16", "16:9"] = Field(
        default="9:16", description="Aspect ratio of the generated video"
    )


class VideoGenerationResult(BaseModel):
    """Unified result from video generation."""

    status: Literal["success", "error"]
    message: str
    output_path: str | None = None
    video_uri: str | None = None  # Google video URI (for extensions)
    task_id: str | None = None  # Kie AI task ID (for extensions)
    provider: VideoProvider
    error_type: str | None = None
