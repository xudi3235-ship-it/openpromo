"""
Callback utilities for pushing job updates to Cloudflare Workers.

This module provides functions to send real-time progress updates
from Modal to the CF Worker, which then broadcasts to clients via WebSocket.

Uses Connect RPC for type-safe, efficient communication.
"""

import time
from types import TracebackType
from typing import Literal

from src.gen.internal.v1.internal_pb2 import (
    VIDEO_JOB_STATE_COMPLETED,
    VIDEO_JOB_STATE_FAILED,
    VIDEO_JOB_STATE_PROCESSING,
    VideoJobEvent,
    VideoJobState,
    VideoJobUpdateRequest,
)
from src.rpc.internal_client import get_internal_service_client

# Re-export for convenience
VideoGenState = VideoJobState


def _map_state_to_proto(state: str | VideoJobState) -> VideoJobState:
    """Map string state to proto enum if needed."""
    if isinstance(state, int):  # Already a proto enum
        return state
    state_map = {
        "processing": VIDEO_JOB_STATE_PROCESSING,
        "completed": VIDEO_JOB_STATE_COMPLETED,
        "failed": VIDEO_JOB_STATE_FAILED,
    }
    return state_map.get(state.lower(), VIDEO_JOB_STATE_PROCESSING)


async def push_video_gen_update(
    workspace_id: str,
    job_id: str,
    state: VideoJobState | str,
    progress: float | None = None,
    message: str | None = None,
    output_url: str | None = None,
) -> bool:
    """
    Push a video generation update to the CF Worker via Connect RPC.

    Args:
        workspace_id: The workspace to send the update to
        job_id: The video generation job ID
        state: Current state (VideoJobState enum or string)
        progress: Progress percentage (0-100), only for processing state
        message: Status message or error description
        output_url: URL of the generated video, only for completed state

    Returns:
        True if the callback was sent successfully, False otherwise
    """
    client = get_internal_service_client()

    # Convert state if it's a string
    proto_state = _map_state_to_proto(state)

    event = VideoJobEvent(
        job_id=job_id,
        state=proto_state,
        timestamp=time.time() * 1000,  # milliseconds
    )
    # Set optional fields only if provided
    if progress is not None:
        event.progress = progress
    if message is not None:
        event.message = message
    if output_url is not None:
        event.output_url = output_url

    request = VideoJobUpdateRequest(
        workspace_id=workspace_id,
        event=event,
    )

    try:
        response = await client.video_job_update(request)
        return response.success
    except Exception as e:
        # Log but don't fail the job if callback fails
        print(f"[callbacks] Failed to push Connect RPC callback: {e}")
        return False


class JobProgressReporter:
    """
    Context manager for reporting job progress.

    Usage:
        async with JobProgressReporter(workspace_id, job_id) as reporter:
            await reporter.update(10, "Starting image generation...")
            # do work
            await reporter.update(50, "Generating video...")
            # do more work
            await reporter.complete(output_url="https://...")
    """

    workspace_id: str
    job_id: str

    def __init__(self, workspace_id: str, job_id: str):
        self.workspace_id = workspace_id
        self.job_id = job_id

    async def __aenter__(self) -> "JobProgressReporter":
        await self.start()
        return self

    async def __aexit__(
        self,
        exc_type: type[BaseException] | None,
        exc_val: BaseException | None,
        exc_tb: TracebackType | None,
    ) -> Literal[False]:
        if exc_type is not None:
            await self.fail(str(exc_val))
        return False

    async def start(self) -> None:
        """Mark job as started/processing."""
        await push_video_gen_update(
            workspace_id=self.workspace_id,
            job_id=self.job_id,
            state=VIDEO_JOB_STATE_PROCESSING,
            progress=0,
            message="Starting...",
        )

    async def update(self, progress: float, message: str) -> None:
        """Update job progress."""
        await push_video_gen_update(
            workspace_id=self.workspace_id,
            job_id=self.job_id,
            state=VIDEO_JOB_STATE_PROCESSING,
            progress=progress,
            message=message,
        )

    async def complete(self, output_url: str, message: str = "Completed") -> None:
        """Mark job as completed."""
        await push_video_gen_update(
            workspace_id=self.workspace_id,
            job_id=self.job_id,
            state=VIDEO_JOB_STATE_COMPLETED,
            progress=100,
            message=message,
            output_url=output_url,
        )

    async def fail(self, error: str) -> None:
        """Mark job as failed."""
        await push_video_gen_update(
            workspace_id=self.workspace_id,
            job_id=self.job_id,
            state=VIDEO_JOB_STATE_FAILED,
            message=error,
        )
