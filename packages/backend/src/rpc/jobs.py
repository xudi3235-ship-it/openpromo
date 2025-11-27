"""
JobsService RPC implementation.

This service handles async job submission and result retrieval for video generation.

Test with:
    curl -X POST https://<modal-url>/jobs.v1.JobsService/SubmitAgentVideoJob \
        -H "Content-Type: application/json" \
        -d '{"product": "test", "product_imgs": [], "avatar_imgs": [], "business": "test", "user_message": "hello", "max_turns": 10}'
"""

import logging
import time
from typing import Literal, override

import modal
from connectrpc.request import RequestContext

from src.gen.jobs.v1.jobs_connect import JobsService, JobsServiceASGIApplication
from src.gen.jobs.v1.jobs_pb2 import (
    ASPECT_RATIO_1_1,
    ASPECT_RATIO_4_3,
    ASPECT_RATIO_16_9,
    CADENCE_DAILY,
    CADENCE_MONTHLY,
    CADENCE_WEEKLY,
    JOB_FUNCTION_AGENT_VIDEO,
    JOB_FUNCTION_EDIT_VIDEO,
    JOB_STATE_FAILED,
    JOB_STATE_IN_PROGRESS,
    JOB_STATE_SUCCEEDED,
    AgentVideoJobPayload,
    AgentVideoJobRequest,
    EditVideoJobPayload,
    EditVideoJobRequest,
    JobFunction,
    JobMetadata,
    JobResultRequest,
    JobResultResponse,
    JobSubmitResponse,
)
from src.openai_agent.agents.main_agent import (
    AgentVideoGenOutput as AgentVideoGenOutputPydantic,
)
from src.openai_agent.agents.main_agent import (
    AgentVideoGenSuccessOut as AgentVideoGenSuccessOutPydantic,
)
from src.routes.schemas import (
    VideoEditResponse,
    VideoGenRequest,
)
from src.routes.schemas import (
    VideoGenResponse as VideoGenResponsePydantic,
)


def _build_agent_video_payload(
    out: AgentVideoGenOutputPydantic | None,
) -> AgentVideoJobPayload | None:
    """Convert pydantic AgentVideoGenOutput to proto payload."""
    if not out:
        return None

    if out.status == "success" and isinstance(
        out.data, AgentVideoGenSuccessOutPydantic
    ):
        return AgentVideoJobPayload(
            video_url=out.data.video_url,
            summary=out.data.summary,
        )

    return None


def _build_call_id(fn: str, modal_id: str, workspace_id: str) -> str:
    suffix = f":{workspace_id}" if workspace_id else ""
    return f"{fn}:{modal_id}{suffix}"


def _parse_call_id(raw_call_id: str) -> tuple[str, str, str]:
    fn_part, sep, remainder = raw_call_id.partition(":")
    if not sep:
        return "", "", ""

    modal_id, sep2, workspace_part = remainder.partition(":")
    if not sep2:
        return fn_part, modal_id, ""

    return fn_part, modal_id, workspace_part


def _build_metadata(
    fn_enum: JobFunction,
    call_id: str,
    workspace_id: str,
) -> JobMetadata:
    now_ms = int(time.time() * 1000)
    return JobMetadata(
        call_id=call_id,
        fn=fn_enum,
        workspace_id=workspace_id,
        created_at_epoch_ms=now_ms,
        updated_at_epoch_ms=now_ms,
    )


def _fn_str_to_enum(fn_str: str) -> JobFunction:
    """Convert function string to JobFunction enum."""
    return (
        JOB_FUNCTION_EDIT_VIDEO if fn_str == "edit_video" else JOB_FUNCTION_AGENT_VIDEO
    )


def _fetch_modal_result(
    modal_call_id: str,
) -> tuple[object | None, str | None, bool]:
    """
    Fetch result from Modal.

    Returns:
        (result, error_message, is_in_progress)
    """
    function_call = modal.FunctionCall.from_id(modal_call_id)

    try:
        result = function_call.get(timeout=0)
        return result, None, False
    except modal.exception.OutputExpiredError:
        return None, "Output expired", False
    except TimeoutError:
        return None, None, True
    except Exception as exc:
        logger.exception("Failed to fetch job result", exc_info=exc)
        return None, str(exc), False


def _process_edit_video_result(
    result: object,
    metadata: JobMetadata,
) -> JobResultResponse:
    """Process edit_video job result."""
    if isinstance(result, dict):
        parsed = VideoEditResponse(**result)
    elif isinstance(result, VideoEditResponse):
        parsed = result
    else:
        return JobResultResponse(
            metadata=metadata,
            state=JOB_STATE_FAILED,
            error_message="Unexpected result payload type",
        )

    return JobResultResponse(
        metadata=metadata,
        state=JOB_STATE_SUCCEEDED,
        edit_video=EditVideoJobPayload(output_url=parsed.output_url),
    )


def _process_agent_video_result(
    result: object,
    metadata: JobMetadata,
) -> JobResultResponse:
    """Process agent_video job result."""
    if isinstance(result, dict):
        parsed = VideoGenResponsePydantic(**result)
    elif isinstance(result, VideoGenResponsePydantic):
        parsed = result
    else:
        return JobResultResponse(
            metadata=metadata,
            state=JOB_STATE_FAILED,
            error_message="Unexpected result payload type",
        )

    status = parsed.data.status
    match status:
        case "success":
            payload = _build_agent_video_payload(parsed.data.out)  # type: ignore[union-attr]  # pyright: ignore[reportAttributeAccessIssue]
            if not payload:
                return JobResultResponse(
                    metadata=metadata,
                    state=JOB_STATE_FAILED,
                    error_message="Agent output missing payload",
                )

            return JobResultResponse(
                metadata=metadata,
                state=JOB_STATE_SUCCEEDED,
                agent_video=payload,
            )

        case "failed":
            return JobResultResponse(
                metadata=metadata,
                state=JOB_STATE_FAILED,
                error_message=getattr(parsed.data, "error", "Unknown error"),
            )
        case "in_progress":
            return JobResultResponse(
                metadata=metadata,
                state=JOB_STATE_IN_PROGRESS,
            )


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

        workspace_id = (
            request.envelope.workspace_id if request.HasField("envelope") else ""
        )

        # Spawn the Modal function
        function = modal.Function.from_name("openpromo-backend", "edit_video")
        call = function.spawn(data)

        call_id = _build_call_id("edit_video", call.object_id, workspace_id)
        return JobSubmitResponse(call_id=call_id)

    @override
    async def submit_agent_video_job(
        self,
        request: AgentVideoJobRequest,
        ctx: RequestContext[AgentVideoJobRequest, JobSubmitResponse],
    ) -> JobSubmitResponse:
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

        workspace_id = (
            request.envelope.workspace_id if request.HasField("envelope") else ""
        )

        # Spawn the Modal function
        function = modal.Function.from_name("openpromo-backend", "agent_video")
        call = function.spawn(data)

        call_id = _build_call_id("agent_video", call.object_id, workspace_id)
        return JobSubmitResponse(call_id=call_id)

    @override
    async def get_job_result(
        self,
        request: JobResultRequest,
        ctx: RequestContext[JobResultRequest, JobResultResponse],
    ) -> JobResultResponse:
        """Get the result of a submitted job."""
        fn_str, modal_call_id, workspace_id = _parse_call_id(request.call_id)
        fn_enum = _fn_str_to_enum(fn_str)
        metadata = _build_metadata(fn_enum, request.call_id, workspace_id)

        if not fn_str or not modal_call_id:
            return JobResultResponse(
                metadata=metadata,
                state=JOB_STATE_FAILED,
                error_message="Invalid call_id format",
            )

        result, error_message, is_in_progress = _fetch_modal_result(modal_call_id)

        if error_message:
            return JobResultResponse(
                metadata=metadata,
                state=JOB_STATE_FAILED,
                error_message=error_message,
            )

        if is_in_progress:
            return JobResultResponse(
                metadata=metadata,
                state=JOB_STATE_IN_PROGRESS,
            )

        if fn_str == "edit_video":
            return _process_edit_video_result(result, metadata)

        if fn_str == "agent_video":
            return _process_agent_video_result(result, metadata)

        return JobResultResponse(
            metadata=metadata,
            state=JOB_STATE_FAILED,
            error_message="Unknown function name",
        )


# Export the ASGI app for mounting
app = JobsServiceASGIApplication(JobsServiceImpl())
