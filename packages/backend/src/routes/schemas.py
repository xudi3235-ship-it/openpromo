from typing import Literal

from agents import TResponseInputItem
from pydantic import BaseModel, Field

from src.openai_agent.agents.main_agent import AgentVideoGenOutput
from src.openai_agent.context import RuntimeContext
from src.openai_agent.helpers import download_image, inspect_tmp_dir, to_img_inputs

DEFAULT_VIDEO_URL = "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4"


class VideoEditRequest(BaseModel):
    input_url: str = DEFAULT_VIDEO_URL
    aspect_ratio: Literal["16:9", "4:3", "1:1"] = "16:9"
    cadence: Literal["daily", "weekly", "monthly"] = "daily"


class VideoEditResponse(BaseModel):
    output_url: str


class VideoGenRequest(BaseModel):
    """request schema for our internal video generation agent."""

    product: str = Field(
        ...,
        description="Product context, stringfied.",
    )
    product_imgs: list[str] = Field(
        ...,
        description="List of product images, urls.",
    )
    avatar_imgs: list[str] = Field(
        ...,
        description="List of avatar images, urls.",
    )
    business: str = Field(
        ...,
        description="Business context, stringfied.",
    )
    user_message: str = Field(
        ...,
        description="User message or instructions for video generation.",
    )
    max_turns: int = Field(
        100,
        description="Maximum number of turns for the AI agent.",
    )

    def to_agent_input(self) -> list[TResponseInputItem]:
        # first download imgs
        for idx, url in enumerate(self.product_imgs):
            download_image(url, f"./tmp/product_img_{idx}.jpg")
            self.product_imgs[idx] = f"./tmp/product_img_{idx}.jpg"

        for idx, url in enumerate(self.avatar_imgs):
            download_image(url, f"./tmp/avatar_img_{idx}.jpg")
            self.avatar_imgs[idx] = f"./tmp/avatar_img_{idx}.jpg"

        return [
            {
                "role": "user",
                "content": [
                    {
                        "type": "input_text",
                        "text": self.user_message,
                    },
                    *to_img_inputs(self.product_imgs),
                    {
                        "type": "input_text",
                        "text": "here are some avatar image references for video generation",
                    },
                    *to_img_inputs(self.avatar_imgs),
                    {
                        "type": "input_text",
                        "text": "here is the current, latest tmp dir structure:\n"
                        + inspect_tmp_dir(),
                    },
                ],
            }
        ]

    def to_agent_runtime_context(self) -> RuntimeContext:
        return RuntimeContext(
            product=self.product,
            business=self.business,
        )


class VideoGenFailResponse(BaseModel):
    status: Literal["failed"] = Field(default="failed", description="Failure status.")
    error: str = Field(..., description="Error message describing the failure.")


class VideoGenInProgressResponse(BaseModel):
    status: Literal["in_progress"] = Field(
        default="in_progress", description="In-progress status."
    )
    progress: float = Field(
        ..., description="Progress percentage of the video generation."
    )
    message: str = Field(
        ..., description="Status message describing the current progress."
    )


class VideoGenSuccessResponse(BaseModel):
    status: Literal["success"] = Field(default="success", description="Success status.")
    out: AgentVideoGenOutput = Field(
        ..., description="Output from the video generation agent."
    )


class VideoGenResponse(BaseModel):
    data: VideoGenFailResponse | VideoGenInProgressResponse | VideoGenSuccessResponse
