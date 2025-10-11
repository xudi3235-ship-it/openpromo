from dataclasses import dataclass
from pathlib import Path
from typing import Literal
from fastapi import FastAPI, Request, HTTPException
import modal
from scalar_fastapi import get_scalar_api_reference
from pydantic import BaseModel
from fastapi.openapi.utils import get_openapi

from src.common import url_to_temp_path
from src.routes.experimental import router as experimental_router


def custom_openapi():
    if fapi.openapi_schema:
        return fapi.openapi_schema
    schema = get_openapi(
        title=fapi.title,
        version=fapi.version,
        description=fapi.description,
        routes=fapi.routes,
    )
    schema.setdefault("components", {}).setdefault("securitySchemes", {}).update(
        {
            "ModalKey": {"type": "apiKey", "in": "header", "name": "Modal-Key"},
            "ModalSecret": {"type": "apiKey", "in": "header", "name": "Modal-Secret"},
        }
    )
    # Apply both headers required globally
    schema["security"] = [{"ModalKey": [], "ModalSecret": []}]
    fapi.openapi_schema = schema
    return schema


fapi = FastAPI(
    summary="OpenPromo Backend API",
    description="Backend API for OpenPromo",
    version="0.1.0",
    title="OpenPromo Backend API",
    openapi_url="/openapi.json",
    servers=[
        {"url": "http://localhost:8000", "description": "Local development server"},
    ],
)
fapi.openapi = custom_openapi
fapi.include_router(experimental_router)


class EchoResponse(BaseModel):
    message: str
    ffmpeg_version: str | None = None
    error: str | None = None


@fapi.get("/")
async def echo(request: Request) -> EchoResponse:
    import subprocess

    # check ffmpeg is installed
    result = subprocess.run(["ffmpeg", "-version"], capture_output=True, text=True)
    if result.returncode != 0:
        return EchoResponse(
            message="Hello from OpenPromo Backend!",
            error="ffmpeg not installed",
        )

    return EchoResponse(
        message="Hello from OpenPromo Backend!",
        ffmpeg_version=result.stdout.splitlines()[0],
    )


@dataclass
class Constants:
    DEFAULT_VIDEO_URL: str = "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4"


class VideoEditRequest(BaseModel):
    input_url: str = Constants.DEFAULT_VIDEO_URL
    aspect_ratio: Literal["16:9", "4:3", "1:1"] = "16:9"  # e.g., "16:9"
    cadence: Literal["daily", "weekly", "monthly"] = "daily"


class VideoEditResponse(BaseModel):
    output_url: str


# ---------- Typed job system additions ----------
# Per-function typed submit request
class EditVideoJobSubmitRequest(BaseModel):
    fn: Literal["edit_video"]
    data: VideoEditRequest


# Union of all job submit request types (extend with | AnotherJobSubmitRequest)
JobSubmitRequest = EditVideoJobSubmitRequest  # type alias for FastAPI


class JobSubmitResponse(BaseModel):
    call_id: str


# Result data union (extend later if more functions added)
JobResultData = VideoEditResponse


class JobResultResponse(BaseModel):
    fn: str
    status: Literal["pending", "succeeded", "failed"]
    result: JobResultData | None = None
    error: str | None = None


class FFprobeRequest(BaseModel):
    input_url: str = Constants.DEFAULT_VIDEO_URL
    cmd: list[str] = [
        "-version"
    ]  # e.g., ["-show_format", "-show_streams", "-print_format", "json"]


class FFprobeResponse(BaseModel):
    output: str
    error: str | None = None


@fapi.post("/ffprobe")
async def run_ffprobe(req: FFprobeRequest) -> FFprobeResponse:
    """Run arbitrary ffprobe command on a given input URL"""
    # 1. download video
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


@fapi.post("/job/submit")
async def submit_job(req: JobSubmitRequest) -> JobSubmitResponse:
    f = modal.Function.from_name("openpromo-backend", req.fn)
    call = f.spawn(req.data)
    return JobSubmitResponse(call_id=f"{req.fn}:{call.object_id}")


FUNCTION_RESPONSE_MODELS: dict[str, type[BaseModel]] = {
    "edit_video": VideoEditResponse,
}


@fapi.get("/job/result/{call_id}")
async def get_job_result_endpoint(call_id: str) -> JobResultResponse:
    fn, _, call_id = call_id.partition(":")
    fc = modal.FunctionCall.from_id(call_id)
    model = FUNCTION_RESPONSE_MODELS.get(fn)
    if not model:
        return JobResultResponse(fn=fn, status="failed", error="Unknown function name")
    try:
        result = fc.get(timeout=0)
    except modal.exception.OutputExpiredError:
        return JobResultResponse(fn=fn, status="failed", error="Output expired")
    except TimeoutError:
        return JobResultResponse(fn=fn, status="pending")
    except Exception as e:
        return JobResultResponse(fn=fn, status="failed", error=str(e))

    if isinstance(result, dict):
        try:
            parsed = model(**result)
        except Exception as e:
            return JobResultResponse(fn=fn, status="failed", error=f"Parse error: {e}")
    elif isinstance(result, model):
        parsed = result
    else:
        return JobResultResponse(
            fn=fn, status="failed", error="Unexpected result payload type"
        )
    return JobResultResponse(fn=fn, status="succeeded", result=parsed)


@fapi.get("/scalar", include_in_schema=False)
def scalar_docs():
    return get_scalar_api_reference(
        openapi_url=fapi.openapi_url,
        title=fapi.title + " - Scalar",
    )


class TranscodeVideoRequest(BaseModel):
    input_url: str = Constants.DEFAULT_VIDEO_URL
    platform: Literal["ig_reel", "fb_reel"]


class TranscodeVideoResponse(BaseModel):
    output_url: str
    transcoded: bool = True
    error: str | None = None


@fapi.post("/video/transcode")
async def transcode_video(req: TranscodeVideoRequest) -> TranscodeVideoResponse:
    from src.video import (
        IgReelTranscoder,
        FbReelTranscoder,
        is_video_compatible_on_ig,
    )
    from src.common import R2Utils

    input_path = await url_to_temp_path(req.input_url)
    if not input_path:
        return TranscodeVideoResponse(
            output_url="", error="Failed to download input video"
        )

    if req.platform == "ig_reel":
        tc = await IgReelTranscoder.from_path(input_path)
        if await is_video_compatible_on_ig(input_path) and not tc.needs_transcode():
            return TranscodeVideoResponse(output_url=req.input_url, transcoded=False)
    elif req.platform == "fb_reel":
        tc = await FbReelTranscoder.from_path(input_path)
        if not tc.needs_transcode():
            return TranscodeVideoResponse(output_url=req.input_url, transcoded=False)
    else:
        raise HTTPException(status_code=400, detail="Unsupported platform")

    output_path = await tc.transcode()
    out, key = R2Utils.cp(output_path, dest_key=output_path.name)
    output_url = R2Utils.gen_presigned_url(str(key))

    return TranscodeVideoResponse(output_url=output_url)
