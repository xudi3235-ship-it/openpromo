from typing import ClassVar, Literal

from pydantic import BaseModel, ConfigDict, Field


class Wan25T2VFastInput(BaseModel):
    """Input model for wan-video/wan-2.5-t2v-fast (text->video, fast variant).

    Fields chosen to reflect typical parameters: prompt, duration (seconds), fps,
    resolution, aspect_ratio, generate_audio, voice, num_outputs and seed.
    """

    MODEL_ID: ClassVar[str] = "wan-video/wan-2.5-t2v-fast"

    prompt: str = Field(
        ..., max_length=5000, description="Text prompt describing the desired video"
    )
    duration_seconds: int | None = Field(
        None, ge=1, le=10, description="Target video duration in seconds (max 10s)"
    )
    fps: int | None = Field(
        None, ge=1, le=60, description="Frames per second for the generated video"
    )
    resolution: Literal["480p", "720p", "1080p"] | None = Field(
        None, description="Common output resolutions supported by WAN 2.5"
    )
    aspect_ratio: Literal["1:1", "2:3", "3:2", "3:4", "4:3", "9:16", "16:9"] | None = (
        Field(None, description="Output aspect ratio")
    )
    generate_audio: bool | None = Field(
        None,
        description="Whether to generate audio (voiceover) together with the video",
    )
    voice: str | None = Field(
        None,
        description="Optional voice identifier for generated audio if supported by model",
    )
    num_outputs: int | None = Field(
        None, ge=1, le=4, description="Number of videos to generate in batch"
    )
    seed: int | None = Field(
        None, description="Optional seed for deterministic generations"
    )

    model_config: ClassVar[ConfigDict] = ConfigDict(use_enum_values=True)
