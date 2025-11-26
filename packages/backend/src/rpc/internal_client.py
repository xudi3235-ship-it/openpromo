"""
Connect RPC client for internal CF Worker communication.

This module provides a client to call the Connect RPC server running
on the Cloudflare Worker. Used for Modal -> CF Worker callbacks.
"""

import os

import httpx

from src.gen.internal.v1.internal_connect import InternalServiceClient
from src.gen.internal.v1.internal_pb2 import (
    VIDEO_JOB_STATE_COMPLETED,
    VIDEO_JOB_STATE_FAILED,
    VIDEO_JOB_STATE_PROCESSING,
    VIDEO_JOB_STATE_UNSPECIFIED,
    VideoJobEvent,
    VideoJobState,
    VideoJobUpdateRequest,
    VideoJobUpdateResponse,
)

# Re-export for convenience
__all__ = [
    "get_internal_service_client",
    "VideoJobState",
    "VIDEO_JOB_STATE_UNSPECIFIED",
    "VIDEO_JOB_STATE_PROCESSING",
    "VIDEO_JOB_STATE_COMPLETED",
    "VIDEO_JOB_STATE_FAILED",
    "VideoJobEvent",
    "VideoJobUpdateRequest",
    "VideoJobUpdateResponse",
]


def get_cf_worker_connect_url() -> str:
    """Get the Connect RPC endpoint URL for the CF Worker."""
    base_url = os.environ.get("VITE_DASHBOARD_URL")
    if not base_url:
        raise ValueError("VITE_DASHBOARD_URL environment variable not set")
    # Connect RPC endpoint is at /api/connect
    return f"{base_url}/api/connect"


def get_admin_token() -> str:
    """Get the admin API token for authentication."""
    token = os.environ.get("ADMIN_API_TOKEN")
    if not token:
        raise ValueError("ADMIN_API_TOKEN environment variable not set")
    return token


def get_internal_service_client() -> InternalServiceClient:
    """
    Get the InternalService Connect RPC client.

    This client communicates with the CF Worker's Connect RPC server
    to push video job updates.

    Returns:
        InternalServiceClient configured to talk to the CF Worker
    """
    base_url = get_cf_worker_connect_url()
    token = get_admin_token()

    # Create httpx client with auth headers
    http_client = httpx.AsyncClient(
        headers={"Authorization": f"Bearer {token}"},
        timeout=30.0,
    )

    return InternalServiceClient(
        address=base_url,
        session=http_client,
    )
