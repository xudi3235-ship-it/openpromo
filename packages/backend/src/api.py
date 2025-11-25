from fastapi import FastAPI
from fastapi.openapi.utils import get_openapi

from src.routes import register_routes


def custom_openapi():
    if fapi.openapi_schema:
        return fapi.openapi_schema
    schema = get_openapi(
        title=fapi.title,
        version=fapi.version,
        description=fapi.description,
        routes=fapi.routes,
        servers=fapi.servers,
    )
    schema.setdefault("components", {}).setdefault("securitySchemes", {}).update(
        {
            "ModalKey": {"type": "apiKey", "in": "header", "name": "Modal-Key"},
            "ModalSecret": {"type": "apiKey", "in": "header", "name": "Modal-Secret"},
        }
    )
    schema["security"] = [{"ModalKey": [], "ModalSecret": []}]
    fapi.openapi_schema = schema
    return schema


fapi = FastAPI(
    summary="OpenPromo Backend API",
    description="Backend API for OpenPromo",
    version="0.1.0",
    title="OpenPromo Backend API",
    servers=[
        # put prod first here
        {
            "url": "https://promobase--openpromo-backend-api.modal.run",
            "description": "prod",
        },
        {
            "url": "https://promobase--openpromo-backend-api-dev.modal.run",
            "description": "dev",
        },
    ],
    openapi_url="/openapi.json",
)
fapi.openapi = custom_openapi

register_routes(fapi)
