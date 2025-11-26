from typing import override

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
    Test with:
        curl -X POST https://<modal-url>/hello.v1.HelloService/SayHello \
            -H "Content-Type: application/json" \
            -d '{"name": "World"}'
    """
    from typing import TYPE_CHECKING, cast

    from connectrpc.request import RequestContext
    from starlette.applications import Starlette
    from starlette.responses import PlainTextResponse
    from starlette.routing import Mount, Route

    # Import generated code (run `make buf` first)
    from src.gen.hello.v1.hello_connect import HelloService, HelloServiceASGIApplication
    from src.gen.hello.v1.hello_pb2 import HelloRequest, HelloResponse

    if TYPE_CHECKING:
        from starlette.types import ASGIApp

    class MyHelloService(HelloService):
        @override
        async def say_hello(
            self,
            request: HelloRequest,
            ctx: RequestContext[HelloRequest, HelloResponse],
        ) -> HelloResponse:  # type: ignore[override]
            return HelloResponse(message=f"Hello, {request.name}!")

    hello_app = HelloServiceASGIApplication(MyHelloService())

    starlette_app = Starlette(
        routes=[
            Route("/healthz", lambda _: PlainTextResponse("OK")),  # pyright: ignore[reportUnknownLambdaType]
            Mount(hello_app.path, cast("ASGIApp", hello_app)),
        ]
    )
    return starlette_app


@app.local_entrypoint()
def dev():
    from dotenv import load_dotenv

    load_dotenv()
    test_product_shot_gen()
    pass
