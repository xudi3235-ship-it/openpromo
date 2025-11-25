from typing import ClassVar, Literal

from pydantic import BaseModel, ConfigDict, Field


class Imagen4FastInput(BaseModel):
    """
    Input parameters for the google/imagen-4-fast model on Replicate.

    This model aims to include the common parameters used for text->image
    generation and editing: prompt, negative_prompt, optional input images,
    output size/width/height, and basic sampling options.
    """

    MODEL_ID: ClassVar[str] = "google/imagen-4-fast"

    prompt: str = Field(
        ..., max_length=5000, description="Text prompt describing the image to generate"
    )

    negative_prompt: str | None = Field(
        None, description="Optional negative prompt to guide what should not appear"
    )

    image_input: list[str] | None = Field(
        None,
        alias="image_input",
        max_length=14,
        description="Reference/input images for editing or multi-image conditioning",
    )

    size: Literal["1K", "2K"] | None = Field(
        None,
        description="Target output size (1K or 2K). Imagen-4 fast supports up to 2K.",
    )

    width: int | None = Field(
        None, ge=8, le=4096, description="Explicit output width in pixels"
    )
    height: int | None = Field(
        None, ge=8, le=4096, description="Explicit output height in pixels"
    )

    num_outputs: int | None = Field(
        None, ge=1, le=16, description="Optional number of images to generate"
    )

    guidance_scale: float | None = Field(
        None,
        ge=0.0,
        le=50.0,
        description="Guidance (classifier-free) scale to control adherence to prompt",
    )

    num_inference_steps: int | None = Field(
        None,
        ge=1,
        le=500,
        description="Number of denoising steps for sampling (speed vs quality)",
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
            "match_input_image",
        ]
        | None
    ) = Field(None, description="Desired aspect ratio or match_input_image")

    model_config: ClassVar[ConfigDict] = ConfigDict(use_enum_values=True)
