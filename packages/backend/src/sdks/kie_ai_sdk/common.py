"""Common API operations."""

from typing import cast

from .models import CreditsResponse, DownloadUrlResponse, GetDownloadUrlRequest
from .protocols import ClientProtocol


class CommonOperations:
    """Common API operations."""

    def __init__(self, client: ClientProtocol) -> None:
        self.client: ClientProtocol = client

    def get_credits(self) -> int:
        """
        Get remaining account credits.

        Returns:
            Integer representing remaining credits

        Example:
            >>> credits = client.common.get_credits()
            >>> print(f"Remaining credits: {credits}")
        """
        response = self.client.session.get(f"{self.client.base_url}/api/v1/chat/credit")
        result = self.client._handle_response(response, CreditsResponse)  # pyright: ignore[reportPrivateUsage]
        return cast(int, result.data)

    def get_download_url(self, url: str) -> str:
        """
        Convert a kie.ai generated file URL to a downloadable URL.

        Args:
            url: Generated file URL from kie.ai services

        Returns:
            Downloadable URL (valid for 20 minutes)

        Note:
            - Only supports kie.ai generated files
            - External URLs will return 422 validation error
            - Download URLs expire after 20 minutes

        Example:
            >>> download_url = client.common.get_download_url(
            ...     "https://tempfile.1f6cxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxbd98"
            ... )
        """
        request = GetDownloadUrlRequest(url=url)

        response = self.client.session.post(
            f"{self.client.base_url}/api/v1/common/download-url",
            json=request.model_dump(by_alias=True),
        )

        result = self.client._handle_response(response, DownloadUrlResponse)  # pyright: ignore[reportPrivateUsage]
        return cast(str, result.data)
