from dataclasses import dataclass
from typing import Literal
import modal
import requests

# ---------- img ----------
python_deps = [
    "fastapi[standard]",
    "scalar-fastapi",
    "requests",
    "boto3",
]
image = (
    modal.Image.debian_slim(python_version="3.11")
    .run_commands(
        "apt update -y && apt install -y ffmpeg",
    )
    .pip_install(*python_deps)
)
secret = modal.Secret.from_name(
    "openpromo-backend-r2-secret",
    required_keys=["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY"],
)

app = modal.App(
    "openpromo-backend",
    image=image,
    secrets=[secret],
    volumes={
        "/openpromo-bucket": modal.CloudBucketMount(
            bucket_name="openpromo-bucket",
            bucket_endpoint_url="https://095f96ce70e75bbf88dea585b6a320a5.r2.cloudflarestorage.com",
            secret=secret,
        )
    },
)


from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from scalar_fastapi import get_scalar_api_reference
from pydantic import BaseModel
from fastapi.openapi.utils import get_openapi
def custom_openapi():
    if fapi.openapi_schema:
        return fapi.openapi_schema
    schema = get_openapi(
        title=fapi.title,
        version=fapi.version,
        description=fapi.description,
        routes=fapi.routes,
    )
    schema.setdefault("components", {}).setdefault("securitySchemes", {}).update({
        "ModalKey": {"type": "apiKey", "in": "header", "name": "Modal-Key"},
        "ModalSecret": {"type": "apiKey", "in": "header", "name": "Modal-Secret"},
    })
    # Apply both headers required globally
    schema["security"] = [{"ModalKey": [], "ModalSecret": []}]
    fapi.openapi_schema = schema
    return schema

def s3_client():
    import boto3
    import os

    return boto3.client(
        "s3",
        endpoint_url="https://095f96ce70e75bbf88dea585b6a320a5.r2.cloudflarestorage.com",
        aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
        region_name="auto",
    )


# ---------- FastAPI app ----------
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


class VideoEditRequest(BaseModel):
    input_url: str = "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4"
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


@app.function()
async def edit_video(req: VideoEditRequest) -> VideoEditResponse:
    # 1. download video
    import json
    import subprocess
    import tempfile

    res = requests.get(req.input_url)
    res.raise_for_status()

    with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as tmp_file:
        tmp_file.write(res.content)
        input_path = tmp_file.name

    # 2. ffmpeg, crop to aspect ratio
    with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as output_file:
        output_path = output_file.name

    probe = subprocess.run(
        [
            "ffprobe",
            "-v",
            "error",
            "-select_streams",
            "v:0",
            "-show_entries",
            "stream=width,height",
            "-of",
            "json",
            input_path,
        ],
        capture_output=True,
        text=True,
        check=True,
    )

    metadata = json.loads(probe.stdout)
    stream_info = metadata.get("streams", [{}])[0]
    width = stream_info.get("width")
    height = stream_info.get("height")
    if not width or not height:
        raise RuntimeError("Unable to determine video dimensions for cropping")

    aspect_w, aspect_h = map(int, req.aspect_ratio.split(":"))
    target_ratio = aspect_w / aspect_h
    source_ratio = width / height

    if source_ratio > target_ratio:
        crop_width = int(height * target_ratio)
        crop_height = height
    else:
        crop_width = width
        crop_height = int(width / target_ratio)

    # Ensure the dimensions are even to avoid encoder issues
    crop_width -= crop_width % 2
    crop_height -= crop_height % 2

    crop_filter = f"crop={crop_width}:{crop_height}"

    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-i",
            input_path,
            "-vf",
            crop_filter,
            "-c:a",
            "copy",
            output_path,
        ],
        check=True,
        capture_output=True,
    )

    # 3. save video to r2
    import os
    import shutil

    cadence_dir = os.path.join("ephemeral", req.cadence)
    bucket_dir = os.path.join("/openpromo-bucket", cadence_dir)
    os.makedirs(bucket_dir, exist_ok=True)

    filename = os.path.basename(output_path)
    key = "/".join((cadence_dir, filename))
    final_output_path = os.path.join(bucket_dir, filename)
    shutil.copy(output_path, final_output_path)
    os.remove(output_path)
    os.remove(input_path)

    # 4. return a presigned url
    s3 = s3_client()
    presigned_url = s3.generate_presigned_url(
        "get_object",
        Params={"Bucket": "openpromo-bucket", "Key": key},
        ExpiresIn=3600,  # URL valid for 1 hour
    )
    return VideoEditResponse(output_url=presigned_url)


@fapi.post("/job/submit")
async def submit_job(req: JobSubmitRequest) -> JobSubmitResponse:
    # req.fn is now a typed Literal; req.data is a typed model
    f = modal.Function.from_name('openpromo-backend', req.fn)
    # Pass the inner data model as dict so the target function receives expected fields
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
        return JSONResponse(content=f"Unknown function name: {fn}", status_code=400)
    try:
        result = fc.get(timeout=0)
    except modal.exception.OutputExpiredError:
        return JSONResponse(content="", status_code=404)
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
        return JobResultResponse(fn=fn, status="failed", error="Unexpected result payload type")
    return JobResultResponse(fn=fn, status="succeeded", result=parsed)

@fapi.get("/scalar", include_in_schema=False)
def scalar_docs():
    return get_scalar_api_reference(
        openapi_url=fapi.openapi_url,
        title=fapi.title + " - Scalar",
    )
@app.local_entrypoint()
def sdk():
    import json
    with open('openapi.json', 'w') as f:
        json.dump(fapi.openapi(), f)


# ---------- Modal app ----------
@app.function(image=image)
@modal.concurrent(max_inputs=100)
@modal.asgi_app(requires_proxy_auth=not modal.is_local)
def api():
    return fapi

