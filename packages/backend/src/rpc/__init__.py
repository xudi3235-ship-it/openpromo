"""
Connect RPC server module.

This module combines all RPC service implementations into a single ASGI app.
To add a new service:
1. Create a new file in src/rpc/ (e.g., product.py)
2. Implement the service class
3. Export the ASGI app
4. Import and mount it here
"""

from typing import TYPE_CHECKING, cast

from starlette.applications import Starlette
from starlette.responses import PlainTextResponse
from starlette.routing import Mount, Route

if TYPE_CHECKING:
    from starlette.types import ASGIApp

from src.rpc.ffprobe import app as ffprobe_app
from src.rpc.hello import app as hello_app
from src.rpc.jobs import app as jobs_app
from src.rpc.video import app as video_app


def create_rpc_app() -> Starlette:
    """Create the combined Connect RPC application with all services."""
    return Starlette(
        routes=[
            Route("/healthz", lambda _: PlainTextResponse("OK")),  # pyright: ignore[reportUnknownLambdaType]
            Mount(hello_app.path, cast("ASGIApp", hello_app)),
            Mount(video_app.path, cast("ASGIApp", video_app)),
            Mount(ffprobe_app.path, cast("ASGIApp", ffprobe_app)),
            Mount(jobs_app.path, cast("ASGIApp", jobs_app)),
        ]
    )


rpc_app = create_rpc_app()
