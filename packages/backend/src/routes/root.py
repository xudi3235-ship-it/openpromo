from fastapi import APIRouter, Request
from pydantic import BaseModel

router = APIRouter()


class EchoResponse(BaseModel):
    message: str
    ffmpeg_version: str | None = None
    error: str | None = None


@router.get("/")
async def echo(_: Request) -> EchoResponse:
    import subprocess

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
