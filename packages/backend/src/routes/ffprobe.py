from fastapi import APIRouter
from pydantic import BaseModel, Field

from src.common import url_to_temp_path
from src.routes.schemas import DEFAULT_VIDEO_URL

router = APIRouter(prefix="/ffprobe", tags=["ffprobe"])


class FFprobeRequest(BaseModel):
    input_url: str = Field(default=DEFAULT_VIDEO_URL)
    cmd: list[str] = Field(default_factory=lambda: ["-version"])


class FFprobeResponse(BaseModel):
    output: str
    error: str | None = None


@router.post("")
async def run_ffprobe(req: FFprobeRequest) -> FFprobeResponse:
    input_path = await url_to_temp_path(req.input_url)
    if not input_path:
        return FFprobeResponse(output="", error="Failed to download input video")

    import subprocess

    result = subprocess.run(
        ["ffprobe", input_path] + req.cmd, capture_output=True, text=True
    )
    if result.returncode != 0:
        return FFprobeResponse(output="", error="ffprobe not installed")
    return FFprobeResponse(output=result.stdout, error=None)
