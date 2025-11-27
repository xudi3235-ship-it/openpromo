"""
JobsService RPC implementation.

This service handles async job submission and result retrieval for video generation.

Test with:
    curl -X POST https://<modal-url>/jobs.v1.JobsService/SubmitAgentVideoJob \
        -H "Content-Type: application/json" \
        -d '{"product": "test", "product_imgs": [], "avatar_imgs": [], "business": "test", "user_message": "hello", "max_turns": 10}'
"""

import logging
from typing import Literal, override

import modal
from agents import Runner
from connectrpc.request import RequestContext

from src.gen.jobs.v1.jobs_connect import JobsService, JobsServiceASGIApplication
from src.gen.jobs.v1.jobs_pb2 import (
    AGENT_OUTPUT_STATUS_ERROR,
    AGENT_OUTPUT_STATUS_SUCCESS,
    ASPECT_RATIO_1_1,
    ASPECT_RATIO_4_3,
    ASPECT_RATIO_16_9,
    CADENCE_DAILY,
    CADENCE_MONTHLY,
    CADENCE_WEEKLY,
    JOB_FUNCTION_AGENT_VIDEO,
    JOB_FUNCTION_EDIT_VIDEO,
    JOB_STATUS_FAILED,
    JOB_STATUS_PENDING,
    JOB_STATUS_SUCCEEDED,
    VIDEO_GEN_STATUS_FAILED,
    VIDEO_GEN_STATUS_SUCCESS,
    AgentVideoGenErrorOut,
    AgentVideoGenOutput,
    AgentVideoGenSuccessOut,
    AgentVideoJobRequest,
    EditVideoJobRequest,
    JobResultRequest,
    JobResultResponse,
    JobSubmitResponse,
    VideoEditResult,
    VideoGenerateRequest,
    VideoGenerateResponse,
    VideoGenFailResult,
    VideoGenSuccessResult,
)
from src.openai_agent.agents.main_agent import (
    AgentVideoGenErrorOut as AgentVideoGenErrorOutPydantic,
)
from src.openai_agent.agents.main_agent import (
    AgentVideoGenOutput as AgentVideoGenOutputPydantic,
)
from src.openai_agent.agents.main_agent import (
    AgentVideoGenSuccessOut as AgentVideoGenSuccessOutPydantic,
)
from src.openai_agent.agents.main_agent import (
    main_agent,
)
from src.openai_agent.hooks import ExampleHooks
from src.routes.schemas import (
    VideoEditResponse,
    VideoGenRequest,
)
from src.routes.schemas import (
    VideoGenResponse as VideoGenResponsePydantic,
)


def _build_agent_video_gen_output(
    out: AgentVideoGenOutputPydantic,
) -> AgentVideoGenOutput:
    """Convert pydantic AgentVideoGenOutput to proto message."""
    if out.status == "success" and isinstance(
        out.data, AgentVideoGenSuccessOutPydantic
    ):
        return AgentVideoGenOutput(
            status=AGENT_OUTPUT_STATUS_SUCCESS,
            success=AgentVideoGenSuccessOut(
                video_url=out.data.video_url,
                summary=out.data.summary,
            ),
        )
    elif out.status == "error" and isinstance(out.data, AgentVideoGenErrorOutPydantic):
        return AgentVideoGenOutput(
            status=AGENT_OUTPUT_STATUS_ERROR,
            error=AgentVideoGenErrorOut(
                error_message=out.data.error_message,
                error_type=out.data.error_type,
            ),
        )
    # Fallback
    return AgentVideoGenOutput(status=AGENT_OUTPUT_STATUS_ERROR)


logger = logging.getLogger(__name__)


class JobsServiceImpl(JobsService):
    """Implementation of the JobsService RPC service."""

    @override
    async def submit_edit_video_job(
        self,
        request: EditVideoJobRequest,
        ctx: RequestContext[EditVideoJobRequest, JobSubmitResponse],
    ) -> JobSubmitResponse:  # type: ignore[override]
        """Submit an edit video job to Modal."""
        from src.routes.schemas import VideoEditRequest

        # Map proto enums to pydantic literals
        aspect_ratio_map: dict[int, Literal["16:9", "4:3", "1:1"]] = {
            ASPECT_RATIO_16_9: "16:9",
            ASPECT_RATIO_4_3: "4:3",
            ASPECT_RATIO_1_1: "1:1",
        }
        cadence_map: dict[int, Literal["daily", "weekly", "monthly"]] = {
            CADENCE_DAILY: "daily",
            CADENCE_WEEKLY: "weekly",
            CADENCE_MONTHLY: "monthly",
        }

        # Create the pydantic request
        data = VideoEditRequest(
            input_url=request.input_url,
            aspect_ratio=aspect_ratio_map.get(request.aspect_ratio, "16:9"),
            cadence=cadence_map.get(request.cadence, "daily"),
        )

        # Spawn the Modal function
        function = modal.Function.from_name("openpromo-backend", "edit_video")
        call = function.spawn(data)

        return JobSubmitResponse(call_id=f"edit_video:{call.object_id}")

    @override
    async def submit_agent_video_job(
        self,
        request: AgentVideoJobRequest,
        ctx: RequestContext[AgentVideoJobRequest, JobSubmitResponse],
    ) -> JobSubmitResponse:  # type: ignore[override]
        """Submit an agent video generation job to Modal."""
        # Create the pydantic request
        data = VideoGenRequest(
            product=request.product,
            product_imgs=list(request.product_imgs),
            avatar_imgs=list(request.avatar_imgs),
            business=request.business,
            user_message=request.user_message,
            max_turns=request.max_turns,
        )

        # Spawn the Modal function
        function = modal.Function.from_name("openpromo-backend", "agent_video")
        call = function.spawn(data)

        return JobSubmitResponse(call_id=f"agent_video:{call.object_id}")

    @override
    async def get_job_result(
        self,
        request: JobResultRequest,
        ctx: RequestContext[JobResultRequest, JobResultResponse],
    ) -> JobResultResponse:  # type: ignore[override]
        """Get the result of a submitted job."""
        # Parse the call_id
        fn_str, _, call_id = request.call_id.partition(":")
        logger.debug(f"Parsing call_id: fn_str={fn_str}, call_id={call_id}")
        fn_enum = (
            JOB_FUNCTION_EDIT_VIDEO
            if fn_str == "edit_video"
            else JOB_FUNCTION_AGENT_VIDEO
        )
        if not call_id:
            return JobResultResponse(
                fn=fn_enum,
                status=JOB_STATUS_FAILED,
                error="Invalid call_id format",
            )

        # Get the function call
        function_call = modal.FunctionCall.from_id(call_id)

        try:
            result = function_call.get(timeout=0)
        except modal.exception.OutputExpiredError:
            return JobResultResponse(
                fn=fn_enum, status=JOB_STATUS_FAILED, error="Output expired"
            )
        except TimeoutError:
            return JobResultResponse(fn=fn_enum, status=JOB_STATUS_PENDING)
        except Exception as exc:
            return JobResultResponse(
                fn=fn_enum, status=JOB_STATUS_FAILED, error=str(exc)
            )

        # Handle different function types
        if fn_str == "edit_video":
            if isinstance(result, dict):
                parsed = VideoEditResponse(**result)
            elif isinstance(result, VideoEditResponse):
                parsed = result
            else:
                return JobResultResponse(
                    fn=JOB_FUNCTION_EDIT_VIDEO,
                    status=JOB_STATUS_FAILED,
                    error="Unexpected result payload type",
                )
            return JobResultResponse(
                fn=JOB_FUNCTION_EDIT_VIDEO,
                status=JOB_STATUS_SUCCEEDED,
                edit_result=VideoEditResult(output_url=parsed.output_url),
            )

        elif fn_str == "agent_video":
            if isinstance(result, dict):
                parsed = VideoGenResponsePydantic(**result)
            elif isinstance(result, VideoGenResponsePydantic):
                parsed = result
            else:
                return JobResultResponse(
                    fn=JOB_FUNCTION_AGENT_VIDEO,
                    status=JOB_STATUS_FAILED,
                    error="Unexpected result payload type",
                )

            # Extract the agent output from the response
            if parsed.data.status == "success":
                agent_out = _build_agent_video_gen_output(parsed.data.out)  # type: ignore[union-attr]
                return JobResultResponse(
                    fn=JOB_FUNCTION_AGENT_VIDEO,
                    status=JOB_STATUS_SUCCEEDED,
                    video_gen_result=VideoGenSuccessResult(out=agent_out),
                )
            elif parsed.data.status == "failed":
                return JobResultResponse(
                    fn=JOB_FUNCTION_AGENT_VIDEO,
                    status=JOB_STATUS_FAILED,
                    error=getattr(parsed.data, "error", "Unknown error"),
                )
            else:
                # in_progress
                return JobResultResponse(
                    fn=JOB_FUNCTION_AGENT_VIDEO,
                    status=JOB_STATUS_PENDING,
                )

        else:
            return JobResultResponse(
                fn=fn_enum, status=JOB_STATUS_FAILED, error="Unknown function name"
            )

    @override
    async def generate_video(
        self,
        request: VideoGenerateRequest,
        ctx: RequestContext[VideoGenerateRequest, VideoGenerateResponse],
    ) -> VideoGenerateResponse:  # type: ignore[override]
        """Generate a video synchronously using the AI agent."""
        try:
            # Create the pydantic request for agent input conversion
            req = VideoGenRequest(
                product=request.product,
                product_imgs=list(request.product_imgs),
                avatar_imgs=list(request.avatar_imgs),
                business=request.business,
                user_message=request.user_message,
                max_turns=request.max_turns,
            )

            # Run the agent
            result = await Runner.run(
                main_agent,
                max_turns=req.max_turns,
                hooks=ExampleHooks(),
                input=req.to_agent_input(),
                context=req.to_agent_runtime_context(),
            )
            agent_output = result.final_output_as(AgentVideoGenOutputPydantic)

            # Build proto response
            proto_out = _build_agent_video_gen_output(agent_output)
            return VideoGenerateResponse(
                status=VIDEO_GEN_STATUS_SUCCESS,
                success=VideoGenSuccessResult(out=proto_out),
            )

        except Exception as e:
            return VideoGenerateResponse(
                status=VIDEO_GEN_STATUS_FAILED,
                fail=VideoGenFailResult(error=str(e)),
            )


# Export the ASGI app for mounting
app = JobsServiceASGIApplication(JobsServiceImpl())
