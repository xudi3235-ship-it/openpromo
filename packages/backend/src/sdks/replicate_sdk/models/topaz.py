from typing import ClassVar, Literal

from pydantic import BaseModel, ConfigDict, Field


class TopazVideoUpscaleInput(BaseModel):
    """
    Input parameters for the topazlabs/video-upscale model.
    """

    MODEL_ID: ClassVar[str] = "topazlabs/video-upscale"

    video: str = Field(..., description="Video file to upscale (URL or path)")
    target_fps: int = Field(
        30, ge=15, le=60, description="Target FPS (choose from 15-60fps)"
    )
    target_resolution: Literal["720p", "1080p", "4k"] = Field(
        "1080p", description="Target resolution"
    )

    model_config: ClassVar[ConfigDict] = ConfigDict(use_enum_values=True)
