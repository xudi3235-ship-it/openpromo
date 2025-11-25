from typing import ClassVar, Literal

from pydantic import BaseModel, ConfigDict, Field


class NanoBananaProInput(BaseModel):
    """
    Input parameters for the google/nano-banana-pro model on Replicate.

    The model accepts a text prompt and optional reference images and
    generation configuration (aspect ratio, resolution, and output format).
    """

    MODEL_ID: ClassVar[str] = "google/nano-banana-pro"

    prompt: str = Field(
        ..., max_length=5000, description="Text description of the image to generate"
    )

    # Replicate models accept image references as URLs or paths — allow a list
    # (up to 14 images according to model docs) so callers can provide references.
    image_input: list[str] | None = Field(
        None,
        alias="image_input",
        max_length=14,
        description="Input images to transform or use as reference (up to 14 images)",
    )

    aspect_ratio: (
        Literal[
            "1:1",
            "2:3",
            "3:2",
            "3:4",
            "4:3",
            "9:16",
            "16:9",
        ]
        | None
    ) = Field(
        None, alias="aspect_ratio", description="Aspect ratio of the generated image"
    )

    resolution: Literal["1K", "2K", "4K"] | None = Field(
        None, description="Resolution of the generated image (1K, 2K or 4K)"
    )

    output_format: Literal["PNG", "JPG"] | None = Field(
        None, alias="output_format", description="Output image format"
    )

    num_outputs: int | None = Field(
        None,
        ge=1,
        le=16,
        description="Optional number of images to generate (if model supports multiple outputs)",
    )

    model_config: ClassVar[ConfigDict] = ConfigDict(use_enum_values=True)
