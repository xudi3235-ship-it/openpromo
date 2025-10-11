from typing import Literal

import modal
from fastapi import APIRouter
from pydantic import BaseModel

from src.routes.schemas import VideoEditRequest, VideoEditResponse

router = APIRouter(prefix="/job", tags=["jobs"])


class JobSubmitResponse(BaseModel):
    call_id: str


class JobResultResponse(BaseModel):
    fn: str
    status: Literal["pending", "succeeded", "failed"]
    result: VideoEditResponse | None = None
    error: str | None = None


class EditVideoJobSubmitRequest(BaseModel):
    fn: Literal["edit_video"]
    data: VideoEditRequest


JobSubmitRequest = EditVideoJobSubmitRequest

FUNCTION_RESPONSE_MODELS: dict[str, type[BaseModel]] = {
    "edit_video": VideoEditResponse,
}


@router.post("/submit")
async def submit_job(req: JobSubmitRequest) -> JobSubmitResponse:
    function = modal.Function.from_name("openpromo-backend", req.fn)
    call = function.spawn(req.data)
    return JobSubmitResponse(call_id=f"{req.fn}:{call.object_id}")


@router.get("/result/{call_id}")
async def get_job_result(call_id: str) -> JobResultResponse:
    fn, _, call_id = call_id.partition(":")
    function_call = modal.FunctionCall.from_id(call_id)
    model = FUNCTION_RESPONSE_MODELS.get(fn)
    if not model:
        return JobResultResponse(fn=fn, status="failed", error="Unknown function name")
    try:
        result = function_call.get(timeout=0)
    except modal.exception.OutputExpiredError:
        return JobResultResponse(fn=fn, status="failed", error="Output expired")
    except TimeoutError:
        return JobResultResponse(fn=fn, status="pending")
    except Exception as exc:
        return JobResultResponse(fn=fn, status="failed", error=str(exc))

    if isinstance(result, dict):
        try:
            parsed = model(**result)
        except Exception as exc:
            return JobResultResponse(
                fn=fn, status="failed", error=f"Parse error: {exc}"
            )
    elif isinstance(result, model):
        parsed = result
    else:
        return JobResultResponse(
            fn=fn, status="failed", error="Unexpected result payload type"
        )
    return JobResultResponse(fn=fn, status="succeeded", result=parsed)
