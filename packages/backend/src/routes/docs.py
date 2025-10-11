from fastapi import APIRouter, Request
from scalar_fastapi import get_scalar_api_reference

router = APIRouter(tags=["docs"])


@router.get("/scalar", include_in_schema=False)
def scalar_docs(request: Request):
    app = request.app
    return get_scalar_api_reference(
        openapi_url=app.openapi_url,
        title=f"{app.title} - Scalar",
    )
