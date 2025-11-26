"""
Callback utilities for pushing job updates to Cloudflare Workers.

This module provides functions to send real-time progress updates
from Modal to the CF Worker, which then broadcasts to clients via WebSocket.

Uses the generated internal_api SDK for type-safe API calls.
"""

import os
import time
from types import TracebackType
from typing import Literal

from src.sdks.internal_api import AuthenticatedClient
from src.sdks.internal_api.api.internal import video_job_update
from src.sdks.internal_api.models.video_job_update_body import VideoJobUpdateBody
from src.sdks.internal_api.models.video_job_update_body_event import (
    VideoJobUpdateBodyEvent,
)
from src.sdks.internal_api.models.video_job_update_body_event_state import (
    VideoJobUpdateBodyEventState,
)

# Re-export for convenience
VideoGenState = VideoJobUpdateBodyEventState


def get_internal_api_client() -> AuthenticatedClient:
    """Get the internal API client for CF Worker communication."""
    base_url = os.environ.get("VITE_DASHBOARD_URL")
    token = os.environ.get("ADMIN_API_TOKEN")

    if not base_url or not token:
        raise ValueError(
            "Internal API client not configured: missing VITE_DASHBOARD_URL or ADMIN_API_TOKEN"
        )

    return AuthenticatedClient(
        base_url=base_url + "/api/orpc",  # worker's internal endpoint
        token=token,
        prefix="Bearer",
    )


async def push_video_gen_update(
    workspace_id: str,
    job_id: str,
    state: VideoJobUpdateBodyEventState,
    progress: float | None = None,
    message: str | None = None,
    output_url: str | None = None,
) -> bool:
    """
    Push a video generation update to the CF Worker.

    Args:
        workspace_id: The workspace to send the update to
        job_id: The video generation job ID
        state: Current state (use VideoJobUpdateBodyEventState enum)
        progress: Progress percentage (0-100), only for processing state
        message: Status message or error description
        output_url: URL of the generated video, only for completed state

    Returns:
        True if the callback was sent successfully, False otherwise
    """
    client = get_internal_api_client()

    event = VideoJobUpdateBodyEvent(
        job_id=job_id,
        state=state,
        timestamp=time.time() * 1000,  # milliseconds
        progress=progress,
        message=message,
        output_url=output_url,
    )

    body = VideoJobUpdateBody(
        workspace_id=workspace_id,
        event=event,
    )

    try:
        response = await video_job_update.asyncio(client=client, body=body)
        return response is not None and response.success
    except Exception as e:
        # Log but don't fail the job if callback fails
        print(f"Failed to push callback: {e}")
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
            state=VideoJobUpdateBodyEventState.PROCESSING,
            progress=0,
            message="Starting...",
        )

    async def update(self, progress: float, message: str) -> None:
        """Update job progress."""
        await push_video_gen_update(
            workspace_id=self.workspace_id,
            job_id=self.job_id,
            state=VideoJobUpdateBodyEventState.PROCESSING,
            progress=progress,
            message=message,
        )

    async def complete(self, output_url: str, message: str = "Completed") -> None:
        """Mark job as completed."""
        await push_video_gen_update(
            workspace_id=self.workspace_id,
            job_id=self.job_id,
            state=VideoJobUpdateBodyEventState.COMPLETED,
            progress=100,
            message=message,
            output_url=output_url,
        )

    async def fail(self, error: str) -> None:
        """Mark job as failed."""
        await push_video_gen_update(
            workspace_id=self.workspace_id,
            job_id=self.job_id,
            state=VideoJobUpdateBodyEventState.FAILED,
            message=error,
        )
