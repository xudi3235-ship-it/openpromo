from typing import Literal, TypeAlias, cast

import modal
from agents import Runner
from fastapi import APIRouter
from pydantic import BaseModel

from src.openai_agent.agents.main_agent import AgentVideoGenOutput, main_agent
from src.openai_agent.hooks import ExampleHooks
from src.routes.schemas import (
    VideoEditRequest,
    VideoEditResponse,
    VideoGenFailResponse,
    VideoGenRequest,
    VideoGenResponse,
    VideoGenSuccessResponse,
)

router = APIRouter(prefix="/job", tags=["jobs"])

AsyncFnName: TypeAlias = Literal["edit_video", "agent_video"]


class JobSubmitResponse(BaseModel):
    call_id: str


class JobResultResponse(BaseModel):
    fn: AsyncFnName
    status: Literal["pending", "succeeded", "failed"]
    result: VideoEditResponse | VideoGenResponse | None = None
    error: str | None = None


class EditVideoJobSubmitRequest(BaseModel):
    fn: Literal["edit_video"]
    data: VideoEditRequest


class AgentVideoJobSubmitRequest(BaseModel):
    fn: Literal["agent_video"]
    data: VideoGenRequest


JobSubmitRequest = EditVideoJobSubmitRequest | AgentVideoJobSubmitRequest

FUNCTION_RESPONSE_MODELS: dict[AsyncFnName, type[BaseModel]] = {
    "edit_video": VideoEditResponse,
    "agent_video": VideoGenResponse,
}


@router.post("/submit")
async def submit_job(req: JobSubmitRequest) -> JobSubmitResponse:
    function = modal.Function.from_name("openpromo-backend", req.fn)
    call = function.spawn(req.data)
    return JobSubmitResponse(call_id=f"{req.fn}:{call.object_id}")


@router.get("/result/{call_id}")
async def get_job_result(call_id: str) -> JobResultResponse:
    fn_str, _, call_id = call_id.partition(":")
    fn = cast(AsyncFnName, fn_str)
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
    return JobResultResponse(
        fn=fn,
        status="succeeded",
        result=cast(VideoEditResponse | VideoGenResponse, parsed),
    )


@router.post("/video/generate")
async def generate_agent_video(req: VideoGenRequest) -> VideoGenResponse:
    """
    Generate a video using the AI agent based on product information and user instructions.

    This endpoint runs the video generation agent synchronously and returns the result.
    For long-running jobs, consider using the /job/submit endpoint instead.
    """
    try:
        # Run the agent
        result = await Runner.run(
            main_agent,
            max_turns=req.max_turns,
            hooks=ExampleHooks(),
            input=req.to_agent_input(),
            context=req.to_agent_runtime_context(),
        )
        agent_output = result.final_output_as(AgentVideoGenOutput)

        return VideoGenResponse(
            data=VideoGenSuccessResponse(
                status="success",
                out=agent_output,
            )
        )

    except Exception as e:
        return VideoGenResponse(
            data=VideoGenFailResponse(
                status="failed",
                error=str(e),
            )
        )
