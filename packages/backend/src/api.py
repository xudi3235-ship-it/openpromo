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
    openapi_url="/openapi.json",
    servers=[
        {"url": "http://localhost:8000", "description": "Local development server"},
    ],
)
fapi.openapi = custom_openapi

register_routes(fapi)
