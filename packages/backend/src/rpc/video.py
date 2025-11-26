"""
VideoService RPC implementation.

Test with:
    curl -X POST https://<modal-url>/video.v1.VideoService/Transcode \
        -H "Content-Type: application/json" \
        -d '{"input_url": "https://example.com/video.mp4", "platform": "ig_reel"}'
"""

from typing import override

from connectrpc.request import RequestContext

from src.common import R2Utils, url_to_temp_path
from src.gen.video.v1.video_connect import VideoService, VideoServiceASGIApplication
from src.gen.video.v1.video_pb2 import TranscodeRequest, TranscodeResponse
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


# Export the ASGI app for mounting
app = VideoServiceASGIApplication(VideoServiceImpl())
