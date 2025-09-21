from pathlib import Path
from attr import dataclass
from fastapi import requests

from src.api import VideoEditRequest, VideoEditResponse
from src.common import s3_client, url_to_temp_path
from src.infra import image, secret, vols
import modal

app = modal.App("video-backend", image=image, secrets=[secret], volumes=vols)


def to_int(v):
    try:
        return int(v) if v is not None else None
    except Exception:
        return None


def to_float(v):
    try:
        return float(v) if v is not None else None
    except Exception:
        return None


@dataclass
class VideoMetadata:
    width: int | None
    height: int | None
    duration: float | None
    bit_rate: int | None
    codec_name: str | None
    raw: dict


async def get_video_meta(path: Path) -> VideoMetadata:
    import subprocess
    import json

    result = subprocess.run(
        [
            "ffprobe",
            "-v",
            "error",
            "-select_streams",
            "v:0",
            "-show_entries",
            "stream=width,height,duration,bit_rate,codec_name",
            "-of",
            "json",
            str(path),
        ],
        capture_output=True,
        text=True,
        check=True,
    )
    metadata = json.loads(result.stdout)
    stream_info = metadata.get("streams", [{}])[0]

    width = to_int(stream_info.get("width"))
    height = to_int(stream_info.get("height"))
    duration = to_float(
        stream_info.get("duration") or metadata.get("format", {}).get("duration")
    )
    bit_rate = to_int(
        stream_info.get("bit_rate") or metadata.get("format", {}).get("bit_rate")
    )
    codec_name = stream_info.get("codec_name")

    return VideoMetadata(
        width=width,
        height=height,
        duration=duration,
        bit_rate=bit_rate,
        codec_name=codec_name,
        raw=metadata,
    )


async def transcode_video_for_ig_reel(path: Path, *, max_width: int = 1080) -> Path:
    """Return a path for an IG-safe mp4 produced from the input clip."""
    import subprocess
    import tempfile

    meta = await get_video_meta(path)

    scale_filter = "setsar=1"
    width = meta.width
    height = meta.height
    if width and height:
        target_width = width
        target_height = height
        if target_width > max_width:
            target_width = max_width
            target_height = int(height * target_width / width)
        # enforce even dimension to keep encoder happy
        if target_width % 2:
            target_width -= 1
        if target_height % 2:
            target_height -= 1
        if target_width < 2:
            target_width = 2
        if target_height < 2:
            target_height = 2
        scale_filter = f"scale={target_width}:{target_height},setsar=1"

    with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as tmp:
        output_path = Path(tmp.name)

    cmd = [
        "ffmpeg",
        "-y",
        "-i",
        str(path),
        "-vf",
        scale_filter,
        "-c:v",
        "libx264",
        "-profile:v",
        "high",
        "-level",
        "4.1",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        "-c:a",
        "aac",
        "-b:a",
        "128k",
        "-ac",
        "2",
        str(output_path),
    ]

    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        output_path.unlink(missing_ok=True)
        raise RuntimeError(f"ffmpeg failed: {result.stderr.strip()}")

    return output_path


@app.function()
async def edit_video(req: VideoEditRequest) -> VideoEditResponse:
    # 1. download video
    import json
    import subprocess
    import tempfile

    res = requests.get(req.input_url)
    res.raise_for_status()

    input_path = await url_to_temp_path(req.input_url)
    # 2. ffmpeg, crop to aspect ratio

    with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as output_file:
        output_path = output_file.name

    meta = await get_video_meta(input_path)
    width, height = meta.width, meta.height
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


"""
IG Ads Api Ref
ref: https://developers.facebook.com/docs/instagram/ads-api/reference/media-requirements/

IG recommended aspect ratio is 1:1 for both video and images, but also supports
aspect ratio of 1.91:1, 4:5, or any in between.

IG Media Ref:
https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/media/
"""


async def is_video_compatible_on_ig(path: Path) -> bool:
    meta = await get_video_meta(path)
    raw = meta.raw or {}
    fmt = raw.get("format", {})

    format_name = (fmt.get("format_name") or "").lower()
    if not any(x in format_name for x in ("mp4", "mov", "m4v", "mp42")):
        return False

    streams = raw.get("streams", []) or []
    video_stream = next((s for s in streams if s.get("codec_type") == "video"), None)
    if not video_stream:
        return False

    vcodec = (video_stream.get("codec_name") or "").lower()
    if not (("h264" in vcodec) or ("hevc" in vcodec) or ("h265" in vcodec)):
        return False

    width = to_int(video_stream.get("width") or meta.width)
    height = to_int(video_stream.get("height") or meta.height)
    if not width or not height:
        return False
    if width > 1920:
        return False

    aspect = width / height if height else None
    if aspect is None or aspect < 0.4 or aspect > 2.39:
        return False

    duration = meta.duration
    if duration is None:
        duration = to_float(fmt.get("duration"))
    if duration is None:
        return False
    if duration < 3 or duration > 15 * 60:
        return False

    return True
