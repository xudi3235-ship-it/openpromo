"""File upload operations."""

import mimetypes
from pathlib import Path

import requests

from .models import (
    FileUploadResponse,
    UploadFileBase64Request,
    UploadFileUrlRequest,
)
from .protocols import ClientProtocol


class UploadOperations:
    """File upload operations."""

    def __init__(self, client: ClientProtocol) -> None:
        self.client: ClientProtocol = client

    def upload_file_base64(
        self, base64_data: str, upload_path: str, file_name: str | None = None
    ) -> FileUploadResponse:
        """
        Upload a file using Base64 encoded data.

        Args:
            base64_data: Base64 encoded file data or data URL format
                - Pure Base64: "iVBORw0KGgoAAAANSUhEUgAA..."
                - Data URL: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
            upload_path: Upload path without leading/trailing slashes (e.g., "images/base64")
            file_name: Optional filename with extension (random if not provided)

        Returns:
            FileUploadResponse with file details including download_url

        Note:
            - Recommended for small files (<10MB)
            - Base64 encoding increases data size by ~33%
            - Files are temporary and deleted after 3 days
            - Same filename overwrites existing (may have cache delay)

        Example:
            >>> result = client.upload.upload_file_base64(
            ...     base64_data="data:image/png;base64,iVBORw0...",
            ...     upload_path="images/uploads",
            ...     file_name="my-image.png"
            ... )
            >>> url = result.data.download_url
        """
        request = UploadFileBase64Request.model_validate(
            {
                "base64Data": base64_data,
                "uploadPath": upload_path,
                "fileName": file_name,
            },
            strict=False,
        )

        response = self.client.session.post(
            "https://kieai.redpandaai.co/api/file-base64-upload",
            json=request.model_dump(by_alias=True, exclude_none=True),
        )

        return self.client._handle_response(response, FileUploadResponse)  # pyright: ignore[reportPrivateUsage]

    def upload_file_stream(
        self,
        file_path: str | Path,
        upload_path: str,
        file_name: str | None = None,
    ) -> FileUploadResponse:
        """
        Upload a file using multipart/form-data (stream).

        Args:
            file_path: Path to the file to upload
            upload_path: Upload path without leading/trailing slashes
            file_name: Optional filename (uses original name if not provided)

        Returns:
            FileUploadResponse with file details including download_url

        Note:
            - Recommended for large files (>10MB)
            - ~33% more efficient than Base64
            - Files are temporary and deleted after 3 days
            - Same filename overwrites existing (may have cache delay)

        Example:
            >>> result = client.upload.upload_file_stream(
            ...     file_path="/path/to/video.mp4",
            ...     upload_path="videos/uploads",
            ...     file_name="my-video.mp4"
            ... )
            >>> url = result.data.download_url
        """
        file_path = Path(file_path)

        if not file_path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")

        # Prepare multipart form data
        with open(file_path, "rb") as f:
            files = {
                "file": (
                    file_path.name,
                    f,
                    mimetypes.guess_type(file_path)[0],
                )
            }

            data = {"uploadPath": upload_path}

            if file_name:
                data["fileName"] = file_name

            # Remove Content-Type header for multipart
            headers = {"Authorization": f"Bearer {self.client.api_key}"}

            response = requests.post(
                "https://kieai.redpandaai.co/api/file-stream-upload",
                headers=headers,
                files=files,  # pyright: ignore[reportArgumentType]
                data=data,
            )

        return self.client._handle_response(response, FileUploadResponse)  # pyright: ignore[reportPrivateUsage]

    def upload_file_url(
        self, file_url: str, upload_path: str, file_name: str | None = None
    ) -> FileUploadResponse:
        """
        Upload a file from a remote URL.

        Args:
            file_url: HTTP/HTTPS URL of the file to download and upload
            upload_path: Upload path without leading/trailing slashes
            file_name: Optional filename (random if not provided)

        Returns:
            FileUploadResponse with file details including download_url

        Note:
            - Downloads from URL and uploads to kie.ai
            - URL must be publicly accessible
            - 30 second download timeout
            - Recommended max file size: 100MB
            - Files are temporary and deleted after 3 days

        Example:
            >>> result = client.upload.upload_file_url(
            ...     file_url="https://example.com/image.jpg",
            ...     upload_path="images/downloaded",
            ...     file_name="downloaded-image.jpg"
            ... )
            >>> url = result.data.download_url
        """
        request = UploadFileUrlRequest.model_validate(
            {"fileUrl": file_url, "uploadPath": upload_path, "fileName": file_name},
            strict=False,
        )

        response = self.client.session.post(
            "https://kieai.redpandaai.co/api/file-url-upload",
            json=request.model_dump(by_alias=True, exclude_none=True),
        )

        return self.client._handle_response(response, FileUploadResponse)  # pyright: ignore[reportPrivateUsage]
