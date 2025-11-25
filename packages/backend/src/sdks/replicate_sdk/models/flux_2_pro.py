from typing import ClassVar, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class Flux2ProInput(BaseModel):
    """Input parameters for the black-forest-labs/flux-2-pro model."""

    MODEL_ID: ClassVar[str] = "black-forest-labs/flux-2-pro"

    prompt: str = Field(..., description="Text prompt for image generation or editing")

    input_images: list[str] | None = Field(
        default=None,
        description="List of input/reference images (max 8) as URLs or paths",
    )

    aspect_ratio: (
        Literal[
            "match_input_image",
            "custom",
            "1:1",
            "16:9",
            "3:2",
            "2:3",
            "4:5",
            "5:4",
            "9:16",
            "3:4",
            "4:3",
        ]
        | None
    ) = Field(
        "1:1",
        description="Aspect ratio for the generated image",
    )

    resolution: Literal["0.5 MP", "1 MP", "2 MP", "4 MP"] | None = Field(
        "1 MP",
        description="Resolution in megapixels (ignored when aspect_ratio is custom)",
    )

    width: int | None = Field(
        None,
        ge=256,
        le=2048,
        description="Width (pixels) when using custom aspect ratio",
    )

    height: int | None = Field(
        None,
        ge=256,
        le=2048,
        description="Height (pixels) when using custom aspect ratio",
    )

    seed: int | None = Field(None, description="Random seed for reproducible results")

    output_format: Literal["webp", "jpg", "png"] | None = Field(
        "webp", description="Output image format"
    )

    output_quality: int | None = Field(
        80,
        ge=0,
        le=100,
        description="Quality for lossy outputs (not used for PNG)",
    )

    safety_tolerance: int | None = Field(
        2,
        ge=1,
        le=6,
        description="Safety tolerance (1 strict - 6 permissive)",
    )

    prompt_upsampling: bool | None = Field(
        False,
        description="Enable prompt upsampling for more creative results",
    )

    model_config: ClassVar[ConfigDict] = ConfigDict(use_enum_values=True)

    @field_validator("width", "height")
    def _validate_multiple_of_32(cls, value: int | None) -> int | None:
        if value is None:
            return value
        if value % 32 != 0:
            raise ValueError("Dimensions must be multiples of 32")
        return value
