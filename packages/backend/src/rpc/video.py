"""
VideoService RPC implementation.

Test with:
    curl -X POST https://<modal-url>/video.v1.VideoService/Transcode \
        -H "Content-Type: application/json" \
        -d '{"input_url": "https://example.com/video.mp4", "platform": "ig_reel"}'
"""

from pathlib import Path
from typing import override

from connectrpc.request import RequestContext

from src.common import R2Utils, url_to_temp_path
from src.gen.video.v1.video_connect import VideoService, VideoServiceASGIApplication
from src.gen.video.v1.video_pb2 import (
    RunFfmpegRequest,
    RunFfmpegResponse,
    TranscodeRequest,
    TranscodeResponse,
)
from src.video import FbReelTranscoder, IgReelTranscoder, is_video_compatible_on_ig


class VideoServiceImpl(VideoService):
    """Implementation of the VideoService RPC service."""

    @override
    async def transcode(
        self,
        request: TranscodeRequest,
        ctx: RequestContext[TranscodeRequest, TranscodeResponse],
    ) -> TranscodeResponse:  # type: ignore[override]
        input_path = await url_to_temp_path(request.input_url)
        if not input_path:
            return TranscodeResponse(
                output_url="",
                transcoded=False,
                error="Failed to download input video",
            )

        platform = request.platform
        if platform == "ig_reel":
            transcoder = await IgReelTranscoder.from_path(input_path)
            if (
                await is_video_compatible_on_ig(input_path)
                and not transcoder.needs_transcode()
            ):
                return TranscodeResponse(
                    output_url=request.input_url,
                    transcoded=False,
                )
        elif platform == "fb_reel":
            transcoder = await FbReelTranscoder.from_path(input_path)
            if not transcoder.needs_transcode():
                return TranscodeResponse(
                    output_url=request.input_url,
                    transcoded=False,
                )
        else:
            return TranscodeResponse(
                output_url="",
                transcoded=False,
                error=f"Unsupported platform: {platform}",
            )

        output_path = await transcoder.transcode()
        _, key = R2Utils.cp(output_path, dest_key=output_path.name)
        output_url = R2Utils.gen_presigned_url(str(key))

        return TranscodeResponse(
            output_url=output_url,
            transcoded=True,
        )

    @override
    async def run_ffmpeg(
        self,
        request: RunFfmpegRequest,
        ctx: RequestContext[RunFfmpegRequest, RunFfmpegResponse],
    ) -> RunFfmpegResponse:  # type: ignore[override]
        """RPC wrapper to execute ffmpeg with placeholders.

        Placeholders: {in0}, {in1}, ... and {out}
        """
        import os
        import subprocess
        import tempfile

        input_paths: list[str] = []
        try:
            for u in request.input_urls:
                p = await url_to_temp_path(u)
                input_paths.append(str(p))
        except Exception as e:
            return RunFfmpegResponse(
                output_url="", success=False, error=f"Failed to download input: {e}"
            )

        suffix = os.path.splitext(request.output_filename or ".mp4")[1] or ".mp4"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as out_tmp:
            output_path = out_tmp.name

        argv: list[str] = []
        for token in request.command:
            if (
                isinstance(token, str)
                and token.startswith("{in")
                and token.endswith("}")
            ):
                try:
                    idx = int(token[3:-1])
                    argv.append(input_paths[idx])
                except Exception:
                    return RunFfmpegResponse(
                        output_url="",
                        success=False,
                        error=f"Invalid input placeholder: {token}",
                    )
            elif token == "{out}":
                argv.append(output_path)
            else:
                argv.append(token)

        ffmpeg_cmd = ["ffmpeg", "-y"] + argv

        try:
            subprocess.run(ffmpeg_cmd, check=True, capture_output=True, text=True)
        except subprocess.CalledProcessError as exc:
            try:
                os.remove(output_path)
            except Exception:
                pass
            stderr = exc.stderr or exc.stdout
            return RunFfmpegResponse(
                output_url="", success=False, error=(stderr or str(exc))
            )

        try:
            dest_name = request.output_filename or os.path.basename(output_path)
            _, key = R2Utils.cp(Path(output_path), dest_key=dest_name)
            url = R2Utils.gen_presigned_url(str(key))
        except Exception as e:
            return RunFfmpegResponse(
                output_url="", success=False, error=f"Failed to upload output: {e}"
            )
        finally:
            try:
                os.remove(output_path)
            except Exception:
                pass
            for p in input_paths:
                try:
                    os.remove(p)
                except Exception:
                    pass

        return RunFfmpegResponse(output_url=url, success=True)


# Export the ASGI app for mounting
app = VideoServiceASGIApplication(VideoServiceImpl())
