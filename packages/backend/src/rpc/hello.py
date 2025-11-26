"""
HelloService RPC implementation.

Test with:
    curl -X POST https://<modal-url>/hello.v1.HelloService/SayHello \
        -H "Content-Type: application/json" \
        -d '{"name": "World"}'
"""

from typing import override

from connectrpc.request import RequestContext

from src.gen.hello.v1.hello_connect import HelloService, HelloServiceASGIApplication
from src.gen.hello.v1.hello_pb2 import HelloRequest, HelloResponse


class HelloServiceImpl(HelloService):
    """Implementation of the HelloService RPC service."""

    @override
    async def say_hello(
        self,
        request: HelloRequest,
        ctx: RequestContext[HelloRequest, HelloResponse],
    ) -> HelloResponse:  # type: ignore[override]
        return HelloResponse(message=f"Hello, {request.name}!")


# Export the ASGI app for mounting
app = HelloServiceASGIApplication(HelloServiceImpl())
