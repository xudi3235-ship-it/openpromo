from pathlib import Path
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
        if (
            await is_video_compatible_on_ig(input_path)
            and not transcoder.needs_transcode()
        ):
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


class RunFfmpegRequest(BaseModel):
    """
    Execute an `ffmpeg` command on the server.

    Fields:
    - `input_urls`: list of URLs for input media. They will be downloaded
      and available as placeholders `{in0}`, `{in1}`, ... in `command`.
    - `command`: array of ffmpeg argv tokens. Use placeholders `{in0}`, `{in1}`,
      ... and `{out}` for the output path. Example:
        ["-i", "{in0}", "-vf", "scale=720:-2", "{out}"]
    - `output_filename`: optional desired filename for the produced artifact.
    """

    input_urls: list[str]
    command: list[str]
    output_filename: str | None = None


class RunFfmpegResponse(BaseModel):
    output_url: str | None = None
    success: bool = True
    error: str | None = None


@router.post("/ffmpeg")
async def run_ffmpeg(req: RunFfmpegRequest) -> RunFfmpegResponse:
    """Download inputs, run ffmpeg with provided argv (placeholders allowed),
    upload result to R2 and return a presigned URL.
    """
    import os
    import subprocess
    import tempfile

    from src.common import R2Utils, url_to_temp_path

    if not req.command or not isinstance(req.command, list):
        return RunFfmpegResponse(success=False, error="Invalid command")

    # 1) download inputs
    input_paths: list[str] = []
    try:
        for u in req.input_urls:
            p = await url_to_temp_path(u)
            input_paths.append(str(p))
    except Exception as e:
        return RunFfmpegResponse(success=False, error=f"Failed to download input: {e}")

    # 2) prepare output temp file
    suffix = os.path.splitext(req.output_filename or ".mp4")[1] or ".mp4"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as out_tmp:
        output_path = out_tmp.name

    # 3) build command by replacing placeholders
    argv: list[str] = []
    for token in req.command:
        if isinstance(token, str) and token.startswith("{in") and token.endswith("}"):
            # token like {in0}
            try:
                idx = int(token[3:-1])
                argv.append(input_paths[idx])
            except Exception:
                return RunFfmpegResponse(
                    success=False, error=f"Invalid input placeholder: {token}"
                )
        elif token == "{out}":
            argv.append(output_path)
        else:
            argv.append(token)

    ffmpeg_cmd = ["ffmpeg", "-y"] + argv

    # 4) run ffmpeg
    try:
        subprocess.run(ffmpeg_cmd, check=True, capture_output=True, text=True)
    except subprocess.CalledProcessError as exc:
        # cleanup
        try:
            os.remove(output_path)
        except Exception:
            pass
        stderr = exc.stderr or exc.stdout
        return RunFfmpegResponse(success=False, error=(stderr or str(exc)))

    # 5) upload to R2
    try:
        dest_name = req.output_filename or os.path.basename(output_path)
        _, key = R2Utils.cp(Path(output_path), dest_key=dest_name)
        url = R2Utils.gen_presigned_url(str(key))
    except Exception as e:
        return RunFfmpegResponse(success=False, error=f"Failed to upload output: {e}")
    finally:
        # cleanup temp files
        try:
            os.remove(output_path)
        except Exception:
            pass
        for p in input_paths:
            try:
                os.remove(p)
            except Exception:
                pass

    return RunFfmpegResponse(output_url=url)
