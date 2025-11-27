from pathlib import Path
from typing import Any

import modal
from attr import dataclass

from src.common import s3_client, url_to_temp_path
from src.infra import image, secret, vols
from src.logger import logger
from src.routes.schemas import (
    VideoEditRequest,
    VideoEditResponse,
    VideoGenFailResponse,
    VideoGenRequest,
    VideoGenResponse,
    VideoGenSuccessResponse,
)

app = modal.App("video-backend", image=image, secrets=[secret], volumes=vols)  # pyright: ignore[reportArgumentType]


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
    raw: dict[str, Any]
    fps: float | None = None


async def get_video_meta(path: Path) -> VideoMetadata:
    import json
    import subprocess

    result = subprocess.run(
        [
            "ffprobe",
            "-v",
            "error",
            "-select_streams",
            "v:0",
            "-show_entries",
            "stream=width,height,duration,bit_rate,codec_name,avg_frame_rate",
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

    def parse_fps(fr):
        if not fr or fr in ("0/0", "N/A"):
            return None
        if "/" in fr:
            n, d = fr.split("/")
            try:
                n = float(n)
                d = float(d)
                if d:
                    return n / d
            except Exception:
                return None
        try:
            return float(fr)
        except Exception:
            return None

    width = to_int(stream_info.get("width"))
    height = to_int(stream_info.get("height"))
    duration = to_float(
        stream_info.get("duration") or metadata.get("format", {}).get("duration")
    )
    bit_rate = to_int(
        stream_info.get("bit_rate") or metadata.get("format", {}).get("bit_rate")
    )
    codec_name = stream_info.get("codec_name")
    fps = parse_fps(stream_info.get("avg_frame_rate"))

    return VideoMetadata(
        width=width,
        height=height,
        duration=duration,
        bit_rate=bit_rate,
        codec_name=codec_name,
        raw=metadata,
        fps=fps,
    )


@dataclass
class IgReelTranscoder:
    path: Path
    meta: VideoMetadata
    max_width: int = 1080

    @classmethod
    async def from_path(
        cls, path: Path, *, max_width: int = 1080
    ) -> "IgReelTranscoder":
        meta = await get_video_meta(path)
        return cls(path=path, max_width=max_width, meta=meta)

    async def transcode(self) -> Path:
        meta = self.meta
        if not self.needs_transcode():
            return self.path

        import subprocess
        import tempfile

        with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as tmp:
            output_path = Path(tmp.name)

        scale_filter = "setsar=1"
        width = meta.width
        height = meta.height
        if width and height:
            target_width = width
            target_height = height
            if target_width > self.max_width:
                target_width = self.max_width
                target_height = int(height * target_width / width)
            if target_width % 2:
                target_width -= 1
            if target_height % 2:
                target_height -= 1
            if target_width < 2:
                target_width = 2
            if target_height < 2:
                target_height = 2
            scale_filter = f"scale={target_width}:{target_height},setsar=1"

        cmd = [
            "ffmpeg",
            "-y",
            "-i",
            str(self.path),
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

        try:
            subprocess.run(cmd, capture_output=True, text=True, check=True)
        except subprocess.CalledProcessError as exc:
            output_path.unlink(missing_ok=True)
            stderr = exc.stderr.strip() if exc.stderr else exc.stdout.strip()  # pyright: ignore[reportAny]
            raise RuntimeError(f"ffmpeg failed: {stderr}") from exc

        self.path = output_path
        self.meta = await get_video_meta(output_path)
        return output_path

    def needs_transcode(self) -> bool:
        meta = self.meta
        width, height = meta.width, meta.height
        if not width or not height:
            return True
        if width > self.max_width:
            return True
        if width % 2 or height % 2:
            return True
        return False


async def transcode_video_for_ig_reel(path: Path, *, max_width: int = 1080) -> Path:
    """Return a path for an IG-safe mp4 produced from the input clip."""
    transcoder = await IgReelTranscoder.from_path(path, max_width=max_width)
    return await transcoder.transcode()


@app.function()
async def edit_video(req: VideoEditRequest) -> VideoEditResponse:
    # 1. download video
    import subprocess
    import tempfile

    import requests

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


async def is_video_compatible_on_ig(path: Path) -> bool:
    """
    IG Ads Api Ref
    ref: https://developers.facebook.com/docs/instagram/ads-api/reference/media-requirements/

    IG recommended aspect ratio is 1:1 for both video and images, but also supports
    aspect ratio of 1.91:1, 4:5, or any in between.

    IG Media Ref:
    https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/media/
    """
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


@dataclass
class FbReelTranscoder:
    path: Path
    meta: VideoMetadata

    @classmethod
    async def from_path(cls, path: Path) -> "FbReelTranscoder":
        meta = await get_video_meta(path)
        return cls(path=path, meta=meta)

    async def transcode(self) -> Path:
        if not self.needs_transcode():
            return self.path

        duration = self.meta.duration
        if duration is None or duration < 3 or duration > 90:
            raise RuntimeError(
                "Video duration must be between 3 and 90 seconds for FB Reels"
            )

        import subprocess
        import tempfile

        with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as tmp:
            output_path = Path(tmp.name)

        vf_filters = [
            "scale=1080:1920:force_original_aspect_ratio=decrease",
            "pad=1080:1920:(1080-iw)/2:(1920-ih)/2",
            "fps=30",
            "setsar=1",
        ]

        cmd = [
            "ffmpeg",
            "-y",
            "-i",
            str(self.path),
            "-vf",
            ",".join(vf_filters),
            "-c:v",
            "libx264",
            "-preset",
            "medium",
            "-profile:v",
            "high",
            "-level",
            "4.1",
            "-pix_fmt",
            "yuv420p",
            "-movflags",
            "+faststart",
            "-vsync",
            "cfr",
            "-r",
            "30",
            "-c:a",
            "aac",
            "-b:a",
            "128k",
            "-ac",
            "2",
            str(output_path),
        ]

        try:
            subprocess.run(cmd, capture_output=True, text=True, check=True)
        except subprocess.CalledProcessError as exc:
            output_path.unlink(missing_ok=True)
            stderr = exc.stderr.strip() if exc.stderr else exc.stdout.strip()
            raise RuntimeError(f"ffmpeg failed: {stderr}") from exc

        self.path = output_path
        self.meta = await get_video_meta(output_path)
        return output_path

    def needs_transcode(self) -> bool:
        """
        aspect ratio: 9:16 fixed.
        duration: 3-90 seconds.
        fps: 24-60
        resolution: 1080x1920 recommended, minimum 540x960.
        https://developers.facebook.com/docs/video-api/guides/reels-publishing/
        """
        meta = self.meta
        width, height = meta.width, meta.height
        if not width or not height:
            return True

        aspect = width / height if height else None
        if aspect is None or abs(aspect - 9 / 16) > 0.01:
            return True

        if width < 540 or height < 960:
            return True

        duration = meta.duration
        if duration is None or duration < 3 or duration > 90:
            return True

        fps = meta.fps
        if fps is None or fps < 24 or fps > 60:
            return True

        codec = (meta.codec_name or "").lower()
        if not codec:
            return True
        if "h264" not in codec and "avc" not in codec:
            return True

        return False


@app.function()
async def agent_video(req: VideoGenRequest) -> VideoGenResponse:
    """
    Modal function for async video generation using the AI agent.

    This is spawned by the RPC service and runs asynchronously.
    """
    from agents import Runner

    from src.openai_agent.agents.main_agent import AgentVideoGenOutput, main_agent
    from src.openai_agent.hooks import ExampleHooks

    logger.info(
        "agent_video started",
        extra={
            "product": req.product,
            "product_imgs": req.product_imgs,
            "avatar_imgs": req.avatar_imgs,
            "business": req.business,
            "user_message": req.user_message,
            "max_turns": req.max_turns,
        },
    )

    try:
        # Run the agent
        result = await Runner.run(
            main_agent,
            max_turns=req.max_turns,
            hooks=ExampleHooks(),
            input=req.to_agent_input(),
            context=req.to_agent_runtime_context(),
        )
        agent_output = result.final_output_as(AgentVideoGenOutput)

        logger.info(
            "agent_video succeeded",
            extra={
                "status": agent_output.status,
            },
        )

        return VideoGenResponse(
            data=VideoGenSuccessResponse(
                status="success",
                out=agent_output,
            )
        )

    except Exception as e:
        logger.exception("agent_video failed")
        return VideoGenResponse(
            data=VideoGenFailResponse(
                status="failed",
                error=str(e),
            )
        )
