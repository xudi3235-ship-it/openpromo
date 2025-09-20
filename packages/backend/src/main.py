import modal


image = (
    modal.Image.debian_slim(python_version="3.11")
    .run_commands(
        "apt update -y && apt install -y ffmpeg",
    )
    .pip_install("fastapi[standard]", "scalar-fastapi")
    # .add_local_python_source("src")
)
app = modal.App("openpromo-backend")


from fastapi import FastAPI, Request
from scalar_fastapi import get_scalar_api_reference

# ---------- FastAPI app ----------
fapi = FastAPI(
    summary="OpenPromo Backend API",
    description="Backend API for OpenPromo",
    version="0.1.0",
    title="OpenPromo Backend API",
    servers=[
        {"url": "http://localhost:8000", "description": "Local development server"},
    ],
)


@fapi.get("/")
async def echo(request: Request):
    import subprocess

    # check ffmpeg is installed
    result = subprocess.run(["ffmpeg", "-version"], capture_output=True, text=True)
    if result.returncode != 0:
        return {"error": "ffmpeg not installed"}

    return {
        "message": "Hello from FastAPI",
        "ffmpeg_version": result.stdout.splitlines()[0],
    }


@fapi.get("/scalar", include_in_schema=False)
def scalar_docs():
    return get_scalar_api_reference(
        openapi_url=fapi.openapi_url,
        title=fapi.title + " - Scalar",
    )


# ---------- Modal app ----------
@app.function(image=image)
@modal.concurrent(max_inputs=100)
@modal.asgi_app()
def api():
    return fapi
