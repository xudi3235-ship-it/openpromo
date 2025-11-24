from typing import (
    TYPE_CHECKING,
    Any,
    TypeVar,
)

import requests
from pydantic import BaseModel

from .exceptions import KieAIException

if TYPE_CHECKING:
    from types import TracebackType

    from .common import CommonOperations
    from .jobs import JobsOperations
    from .upload import UploadOperations
    from .veo import VeoOperations

T = TypeVar("T", bound=BaseModel)


class KieAIClient:
    """
    KIE.AI API Client

    Initialize with your API key to access Veo 3.1 video generation,
    file uploads, and common API operations.

    Args:
        api_key: Your KIE.AI API key from https://kie.ai/api-key
        base_url: API base URL (default: https://api.kie.ai)

    Example:
        >>> client = KieAIClient("your-api-key")
        >>> # Generate video
        >>> result = client.veo.generate_video(prompt="A dog playing in a park")
        >>> # Upload file
        >>> upload = client.upload.upload_file_url(
        ...     file_url="https://example.com/image.jpg",
        ...     upload_path="images"
        ... )
        >>> # Get credits
        >>> credits = client.common.get_credits()
    """

    def __init__(self, api_key: str, base_url: str = "https://api.kie.ai"):
        self.api_key: str = api_key
        self.base_url: str = base_url.rstrip("/")
        self.session: requests.Session = requests.Session()
        self.session.headers.update(
            {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
        )

        # Lazy-loaded operation groups
        self._veo: "VeoOperations | None" = None
        self._upload: "UploadOperations | None" = None
        self._common: "CommonOperations | None" = None
        self._jobs: "JobsOperations | None" = None

    @property
    def veo(self) -> "VeoOperations":
        """Access Veo 3.1 video generation operations."""
        if self._veo is None:
            from .veo import VeoOperations

            self._veo = VeoOperations(self)
        return self._veo

    @property
    def upload(self) -> "UploadOperations":
        """Access file upload operations."""
        if self._upload is None:
            from .upload import UploadOperations

            self._upload = UploadOperations(self)
        return self._upload

    @property
    def common(self) -> "CommonOperations":
        """Access common API operations."""
        if self._common is None:
            from .common import CommonOperations

            self._common = CommonOperations(self)
        return self._common

    @property
    def jobs(self) -> "JobsOperations":
        """Access job-based API operations (e.g., Sora 2 Pro Storyboard)."""
        if self._jobs is None:
            from .jobs import JobsOperations

            self._jobs = JobsOperations(self)
        return self._jobs

    def _handle_response(
        self, response: requests.Response, response_model: type[T]
    ) -> T:
        """Handle API response and raise exceptions for errors."""
        try:
            data: Any = response.json()  # pyright: ignore[reportAny]
        except ValueError:
            raise KieAIException(
                response.status_code, f"Invalid JSON response: {response.text}"
            )

        # Parse into Pydantic model
        parsed: T = response_model.model_validate(data)

        # Check for errors (all response models have code and msg)
        if hasattr(parsed, "code"):
            code = getattr(parsed, "code")  # pyright: ignore[reportAny]
            if code != 200:
                msg = getattr(parsed, "msg", "Unknown error")
                raise KieAIException(code, msg, data)  # pyright: ignore[reportAny]

        return parsed

    def close(self):
        """Close the session."""
        self.session.close()

    def __enter__(self):
        """Context manager entry."""
        return self

    def __exit__(
        self,
        exc_type: type[BaseException] | None,
        exc_val: BaseException | None,
        exc_tb: "TracebackType | None",
    ) -> None:
        """Context manager exit."""
        self.close()
