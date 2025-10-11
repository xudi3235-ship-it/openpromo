from fastapi import APIRouter

router = APIRouter(prefix="/experimental", tags=["experimental"])


@router.get("/ping")
async def ping() -> dict[str, str]:
    return {"status": "experimental-ok"}
