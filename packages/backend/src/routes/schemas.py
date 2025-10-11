from typing import Literal

from pydantic import BaseModel


DEFAULT_VIDEO_URL = (
    "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4"
)


class VideoEditRequest(BaseModel):
    input_url: str = DEFAULT_VIDEO_URL
    aspect_ratio: Literal["16:9", "4:3", "1:1"] = "16:9"
    cadence: Literal["daily", "weekly", "monthly"] = "daily"


class VideoEditResponse(BaseModel):
    output_url: str
