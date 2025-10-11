from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from src.common import R2Utils, url_to_temp_path
from src.routes.schemas import DEFAULT_VIDEO_URL
from src.video import FbReelTranscoder, IgReelTranscoder, is_video_compatible_on_ig

router = APIRouter(prefix="/video", tags=["video"])


class TranscodeVideoRequest(BaseModel):
    input_url: str = DEFAULT_VIDEO_URL
    platform: Literal["ig_reel", "fb_reel"]


class TranscodeVideoResponse(BaseModel):
    output_url: str
    transcoded: bool = True
    error: str | None = None


@router.post("/transcode")
async def transcode_video(req: TranscodeVideoRequest) -> TranscodeVideoResponse:
    input_path = await url_to_temp_path(req.input_url)
    if not input_path:
        return TranscodeVideoResponse(
            output_url="", error="Failed to download input video"
        )

    if req.platform == "ig_reel":
        transcoder = await IgReelTranscoder.from_path(input_path)
        if await is_video_compatible_on_ig(input_path) and not transcoder.needs_transcode():
            return TranscodeVideoResponse(output_url=req.input_url, transcoded=False)
    elif req.platform == "fb_reel":
        transcoder = await FbReelTranscoder.from_path(input_path)
        if not transcoder.needs_transcode():
            return TranscodeVideoResponse(output_url=req.input_url, transcoded=False)
    else:
        raise HTTPException(status_code=400, detail="Unsupported platform")

    output_path = await transcoder.transcode()
    _, key = R2Utils.cp(output_path, dest_key=output_path.name)
    output_url = R2Utils.gen_presigned_url(str(key))

    return TranscodeVideoResponse(output_url=output_url)
