from typing import Literal

from pydantic import BaseModel

DEFAULT_VIDEO_URL = "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4"


class VideoEditRequest(BaseModel):
    input_url: str = DEFAULT_VIDEO_URL
    aspect_ratio: Literal["16:9", "4:3", "1:1"] = "16:9"
    cadence: Literal["daily", "weekly", "monthly"] = "daily"


class VideoEditResponse(BaseModel):
    output_url: str


class ProductInfo(BaseModel):
    name: str
    description: str
    images: list[str]
    target_audience: str
    selling_points: str
    extra: dict[str, str] | None = None


class AgentVideoRequest(BaseModel):
    product: ProductInfo
    business: str = "A startup focused on innovative products"
    user_message: str
    max_turns: int = 100


class AgentVideoResponse(BaseModel):
    status: str
    message: str
    result: dict | None = None
