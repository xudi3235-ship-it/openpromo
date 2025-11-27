"""Data models and enums for Nano Banana Pro unified interface."""

from enum import Enum
from typing import Literal

from pydantic import BaseModel, Field


class ImageProvider(str, Enum):
    """Image generation provider options."""

    GOOGLE = "google"  # Google direct API (via Replicate wrapper)
    KIE_AI = "kie_ai"  # Kie AI (job-based API)
    REPLICATE = "replicate"  # Replicate (direct Replicate API)


class GenerationMode(str, Enum):
    """Image generation mode options."""

    TEXT_TO_IMAGE = "text_to_image"
    TRANSFORM_IMAGE = "transform_image"  # Use reference images to transform/generate


# Shared aspect ratio type
AspectRatioType = Literal[
    "1:1",
    "2:3",
    "3:2",
    "3:4",
    "4:3",
    "4:5",
    "5:4",
    "9:16",
    "16:9",
    "21:9",
]

# Shared resolution type
ResolutionType = Literal["1K", "2K", "4K"]

# Shared output format type
OutputFormatType = Literal["PNG", "JPG"]


class UnifiedImageConfig(BaseModel):
    """Unified configuration parameters for image generation."""

    aspect_ratio: AspectRatioType = Field(
        default="1:1", description="Aspect ratio of the generated image"
    )
    resolution: ResolutionType = Field(
        default="2K", description="Resolution of the generated image (1K, 2K, or 4K)"
    )
    output_format: OutputFormatType = Field(
        default="PNG", description="Output format of the generated image"
    )
    num_outputs: int = Field(
        default=1, ge=1, le=16, description="Number of images to generate"
    )


class ImageGenerationResult(BaseModel):
    """Unified result from image generation."""

    status: Literal["success", "error"]
    message: str
    output_path: str | None = None
    image_url: str | None = Field(
        default=None, description="URL of the generated image"
    )
    image_urls: list[str] | None = Field(
        default=None, description="URLs of generated images (for multi-output)"
    )
    task_id: str | None = Field(default=None, description="Kie AI task ID for tracking")
    provider: ImageProvider
    error_type: str | None = Field(
        default=None, description="Type of error if status is 'error'"
    )
