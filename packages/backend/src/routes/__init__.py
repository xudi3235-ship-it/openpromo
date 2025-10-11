from fastapi import FastAPI

from .docs import router as docs_router
from .experimental import router as experimental_router
from .ffprobe import router as ffprobe_router
from .jobs import router as jobs_router
from .root import router as root_router
from .video import router as video_router

ROUTERS = [
    root_router,
    video_router,
    ffprobe_router,
    jobs_router,
    docs_router,
    experimental_router,
]


def register_routes(app: FastAPI) -> None:
    for router in ROUTERS:
        app.include_router(router)
