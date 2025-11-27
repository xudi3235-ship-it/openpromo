"""Data models for Sora 2 Pro Storyboard."""

from enum import Enum
from typing import Literal

from pydantic import BaseModel, Field


class StoryboardAspectRatio(str, Enum):
    """Aspect ratio options for storyboard videos."""

    PORTRAIT = "portrait"
    LANDSCAPE = "landscape"


class StoryboardDuration(str, Enum):
    """Total video duration options."""

    TEN_SECONDS = "10"
    FIFTEEN_SECONDS = "15"
    TWENTY_FIVE_SECONDS = "25"


class StoryboardShot(BaseModel):
    """Individual scene in a storyboard."""

    scene: str = Field(..., description="Scene description/prompt")
    duration: float = Field(
        default=7.5,
        ge=0,
        description="Duration in seconds (typically 7.5s per scene)",
    )


class StoryboardConfig(BaseModel):
    """Configuration for storyboard video generation."""

    n_frames: StoryboardDuration = Field(
        default=StoryboardDuration.FIFTEEN_SECONDS,
        description="Total video length (10s, 15s, or 25s)",
    )
    aspect_ratio: StoryboardAspectRatio = Field(
        default=StoryboardAspectRatio.LANDSCAPE,
        description="Video aspect ratio (portrait or landscape)",
    )


class StoryboardResult(BaseModel):
    """Result from storyboard video generation."""

    status: Literal["success", "error"]
    message: str
    output_path: str | None = None
    video_url: str | None = Field(
        default=None, description="URL of the generated video"
    )
    task_id: str | None = Field(default=None, description="Kie AI task ID for tracking")
    error_type: str | None = Field(
        default=None, description="Type of error if status is 'error'"
    )
