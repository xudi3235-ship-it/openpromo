"""
Callback schemas for Modal → Cloudflare Worker communication.

These schemas define the payload types that Modal sends to the CF worker
for real-time job updates. They are exposed in the OpenAPI spec so that
TypeScript can generate matching Zod schemas via orval codegen.

The generated Zod schemas are used in:
1. ORPC internal routes (for request validation)
2. WebSocket events (for type-safe event payloads)

Design: Modal sends the WebSocket event directly (VideoGenUpdatedEvent),
so the CF worker can pass it through without transformation.
"""

from typing import Literal

from fastapi import APIRouter
from pydantic import BaseModel, Field

router = APIRouter(prefix="/callbacks", tags=["callbacks"])


# ============ Video Generation State ============

VideoGenState = Literal["queued", "processing", "completed", "failed"]
"""
Video generation state:
- queued: Initial state before Modal starts processing  
- processing: Modal is actively generating
- completed: Video generation succeeded
- failed: Video generation failed
"""


# ============ Video Generation WebSocket Event ============


class VideoGenUpdatedEvent(BaseModel):
    """
    WebSocket event fired when a video generation job is updated.
    This is what clients receive via WorkspacePusher.

    Modal sends this directly to the CF worker, which passes it through
    to the WebSocket without transformation.
    """

    type: Literal["video_generation.updated"] = Field(
        default="video_generation.updated", description="Event type discriminator"
    )
    job_id: str = Field(..., description="The video generation job ID")
    state: VideoGenState = Field(..., description="Current state of the job")
    progress: float | None = Field(
        None,
        ge=0,
        le=100,
        description="Progress percentage (0-100), only for processing state",
    )
    message: str | None = Field(None, description="Status message or error description")
    output_url: str | None = Field(
        None, description="URL of the generated video, only for completed state"
    )
    timestamp: int = Field(..., description="Unix timestamp in milliseconds")


# ============ Video Generation Callback Request ============


class VideoGenCallbackRequest(BaseModel):
    """
    Request body for video generation job updates.

    Modal sends this to the CF worker's internal endpoint.
    The CF worker broadcasts the event directly to WebSocket.
    """

    workspace_id: str = Field(..., description="The workspace ID to send the update to")
    event: VideoGenUpdatedEvent = Field(
        ..., description="The WebSocket event to broadcast"
    )


class VideoGenCallbackResponse(BaseModel):
    """Response from the callback endpoint."""

    success: bool = Field(
        ..., description="Whether the callback was processed successfully"
    )
    message: str | None = Field(None, description="Optional message")


# ============ Dummy Route to Include Schemas in OpenAPI ============
# FastAPI only includes schemas that are used in routes.
# This dummy route ensures our callback schemas appear in openapi.json


@router.post(
    "/video-gen/schema",
    response_model=VideoGenCallbackResponse,
    summary="Video Generation Callback Schema",
    description="""
    **This is a schema-only endpoint for documentation purposes.**
    
    The actual callback endpoint is on the Cloudflare Worker at:
    `POST /api/orpc/internal.videoJobUpdate`
    
    This route exists solely to include the callback schemas in the OpenAPI spec,
    enabling TypeScript code generation via orval.
    """,
    include_in_schema=True,
)
async def video_gen_callback_schema(
    _request: VideoGenCallbackRequest,
) -> VideoGenCallbackResponse:
    """
    Schema documentation endpoint - not meant to be called directly.

    The actual implementation is in the Cloudflare Worker's ORPC internal routes.
    """
    return VideoGenCallbackResponse(
        success=False,
        message="This is a schema-only endpoint. Use the CF Worker endpoint instead.",
    )
