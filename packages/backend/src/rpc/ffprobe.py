"""
FFprobeService RPC implementation.

Test with:
    curl -X POST https://<modal-url>/ffprobe.v1.FFprobeService/Probe \
        -H "Content-Type: application/json" \
        -d '{"input_url": "https://example.com/video.mp4", "cmd": ["-show_format"]}'
"""

import subprocess
from typing import override

from connectrpc.request import RequestContext

from src.common import url_to_temp_path
from src.gen.ffprobe.v1.ffprobe_connect import (
    FFprobeService,
    FFprobeServiceASGIApplication,
)
from src.gen.ffprobe.v1.ffprobe_pb2 import FFprobeRequest, FFprobeResponse


class FFprobeServiceImpl(FFprobeService):
    """Implementation of the FFprobeService RPC service."""

    @override
    async def probe(
        self,
        request: FFprobeRequest,
        ctx: RequestContext[FFprobeRequest, FFprobeResponse],
    ) -> FFprobeResponse:  # type: ignore[override]
        input_path = await url_to_temp_path(request.input_url)
        if not input_path:
            return FFprobeResponse(
                output="",
                error="Failed to download input video",
            )

        # Use provided cmd args or default to -version
        cmd_args = list(request.cmd) if request.cmd else ["-version"]

        result = subprocess.run(
            ["ffprobe", str(input_path)] + cmd_args,
            capture_output=True,
            text=True,
        )

        if result.returncode != 0:
            return FFprobeResponse(
                output="",
                error=result.stderr or "ffprobe failed",
            )

        return FFprobeResponse(
            output=result.stdout,
        )


# Export the ASGI app for mounting
app = FFprobeServiceASGIApplication(FFprobeServiceImpl())
