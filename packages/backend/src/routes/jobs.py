from typing import Literal, TypeAlias, cast

import modal
from agents import Runner, TResponseInputItem
from fastapi import APIRouter
from pydantic import BaseModel

from src.openai_agent.agents.main_agent import main_agent
from src.openai_agent.context import ProductContext, RuntimeContext, UserContext
from src.openai_agent.helpers import to_img_inputs
from src.openai_agent.hooks import ExampleHooks
from src.routes.schemas import (
    AgentVideoRequest,
    AgentVideoResponse,
    VideoEditRequest,
    VideoEditResponse,
)

router = APIRouter(prefix="/job", tags=["jobs"])

AsyncFnName: TypeAlias = Literal["edit_video", "agent_video"]


class JobSubmitResponse(BaseModel):
    call_id: str


class JobResultResponse(BaseModel):
    fn: AsyncFnName
    status: Literal["pending", "succeeded", "failed"]
    result: VideoEditResponse | AgentVideoResponse | None = None
    error: str | None = None


class EditVideoJobSubmitRequest(BaseModel):
    fn: Literal["edit_video"]
    data: VideoEditRequest


class AgentVideoJobSubmitRequest(BaseModel):
    fn: Literal["agent_video"]
    data: AgentVideoRequest


JobSubmitRequest = EditVideoJobSubmitRequest | AgentVideoJobSubmitRequest

FUNCTION_RESPONSE_MODELS: dict[AsyncFnName, type[BaseModel]] = {
    "edit_video": VideoEditResponse,
    "agent_video": AgentVideoResponse,
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
        result=cast(VideoEditResponse | AgentVideoResponse, parsed),
    )


@router.post("/agent-video/generate")
async def generate_agent_video(req: AgentVideoRequest) -> AgentVideoResponse:
    """
    Generate a video using the AI agent based on product information and user instructions.

    This endpoint runs the video generation agent synchronously and returns the result.
    For long-running jobs, consider using the /job/submit endpoint instead.
    """
    try:
        # Build the initial input with user message and product images
        user_input_items: list[TResponseInputItem] = [
            {
                "role": "user",
                "content": [
                    {
                        "type": "input_text",
                        "text": req.user_message,
                    },
                    *to_img_inputs(req.product.images),
                ],
            }
        ]

        # Create runtime context
        runtime_context = RuntimeContext(
            user_context=UserContext(
                product=ProductContext(
                    name=req.product.name,
                    description=req.product.description,
                    images=req.product.images,
                    target_audience=req.product.target_audience,
                    selling_points=req.product.selling_points,
                    extra=req.product.extra or {},
                ),
                business=req.business,
                extra={},
            ),
            stage_contexts=[],
        )

        # Run the agent
        result = await Runner.run(
            main_agent,
            max_turns=req.max_turns,
            hooks=ExampleHooks(),
            input=user_input_items,
            context=runtime_context,
        )

        # Extract the final response
        final_messages = result.to_input_list()
        last_message = final_messages[-1] if final_messages else None

        return AgentVideoResponse(
            status="success",
            message="Video generation completed",
            result={
                "final_message": last_message,
                "total_turns": len(final_messages),
            },
        )

    except Exception as e:
        return AgentVideoResponse(
            status="failed",
            message=f"Video generation failed: {str(e)}",
            result=None,
        )
