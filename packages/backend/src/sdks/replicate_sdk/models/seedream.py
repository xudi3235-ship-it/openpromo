from typing import ClassVar, Literal

from pydantic import BaseModel, ConfigDict, Field


class Seedream4Input(BaseModel):
    """
    Input parameters for the bytedance/seedream-4 model on Replicate.

    Mirrors commonly used fields seen in repo usage (size, prompt, image_input,
    max_images, aspect_ratio, and sequential_image_generation).
    """

    MODEL_ID: ClassVar[str] = "bytedance/seedream-4"

    prompt: str = Field(
        ...,
        max_length=5000,
        description="Text prompt describing the image to generate or edit",
    )

    size: Literal["1K", "2K", "4K"] | None = Field(
        None, description="Target output size (e.g. 4K for high-resolution)"
    )

    max_images: int | None = Field(
        None,
        ge=1,
        le=16,
        description="Maximum number of outputs to generate in one run",
    )

    image_input: list[str] | None = Field(
        None,
        alias="image_input",
        max_length=14,
        description="Reference/input images for generation or editing (URLs or file paths)",
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

    sequential_image_generation: Literal["enabled", "disabled"] | None = Field(
        None,
        description="Control sequential generation behavior when doing batch operations",
    )

    model_config: ClassVar[ConfigDict] = ConfigDict(use_enum_values=True)
