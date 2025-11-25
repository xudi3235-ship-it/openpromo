from typing import ClassVar, Literal

from pydantic import BaseModel, ConfigDict, Field


class KlingV25TurboProInput(BaseModel):
    """Input model for kwaivgi/kling-v2.5-turbo-pro (image->video or text->video helpers).

    Designed to support an image -> video workflow where a single image plus
    a prompt creates a short video. Fields include prompt, image_input (single),
    duration_seconds, fps, resolution, aspect_ratio, and num_outputs.
    """

    MODEL_ID: ClassVar[str] = "kwaivgi/kling-v2.5-turbo-pro"

    prompt: str = Field(
        ...,
        max_length=5000,
        description="Text describing motion and transformations to apply",
    )
    image_input: list[str] | None = Field(
        None,
        alias="image_input",
        max_length=1,
        description="Single input image (URL or path) for image-to-video conversion",
    )
    duration_seconds: int | None = Field(
        None, ge=1, le=15, description="Target duration in seconds"
    )
    fps: int | None = Field(
        None, ge=1, le=60, description="Frames per second for the generated video"
    )
    resolution: Literal["480p", "720p", "1080p"] | None = Field(
        None, description="Output video resolution"
    )
    aspect_ratio: Literal["1:1", "2:3", "3:2", "3:4", "4:3", "9:16", "16:9"] | None = (
        Field(None, description="Output aspect ratio")
    )
    motion_style: Literal["cinematic", "smooth", "dynamic", "subtle"] | None = Field(
        None, description="Optional motion style hint"
    )
    num_outputs: int | None = Field(
        None, ge=1, le=4, description="Number of videos to generate"
    )

    model_config: ClassVar[ConfigDict] = ConfigDict(use_enum_values=True)
