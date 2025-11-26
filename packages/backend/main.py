import modal

from src.api import fapi
from src.core.image_genai import test_product_shot_gen
from src.infra import image, secret, vols
from src.video import app as video_backend_app

app = modal.App(
    "openpromo-backend",
    image=image,
    secrets=[secret],
    volumes=vols,  # pyright: ignore[reportArgumentType]
)
app.include(video_backend_app)


# ---------- Modal fn ----------
@app.local_entrypoint()
def sdk():
    import json

    with open("openapi.json", "w") as f:
        json.dump(fapi.openapi(), f)


@app.function(image=image)
@modal.concurrent(max_inputs=100)
@modal.asgi_app(requires_proxy_auth=not modal.is_local)
def api():
    return fapi


# ---------- Connect RPC Server ----------
@app.function(image=image)
@modal.concurrent(max_inputs=100)
@modal.asgi_app(requires_proxy_auth=not modal.is_local)
def connect_rpc():
    """
    Connect RPC server endpoint.

    This provides a Connect Protocol compatible RPC server.
    All services are defined in src/rpc/ and combined into a single app.

    Test with:
        curl -X POST https://<modal-url>/hello.v1.HelloService/SayHello \
            -H "Content-Type: application/json" \
            -d '{"name": "World"}'
    """
    from src.rpc import rpc_app

    return rpc_app


@app.local_entrypoint()
def dev():
    from dotenv import load_dotenv

    load_dotenv()
    test_product_shot_gen()
    pass
