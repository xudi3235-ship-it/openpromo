"""Protocol definitions for type checking without circular imports."""

from typing import Protocol, TypeVar

import requests
from pydantic import BaseModel

T = TypeVar("T", bound=BaseModel)


class ClientProtocol(Protocol):
    """Protocol defining the interface for KieAIClient."""

    api_key: str
    base_url: str
    session: requests.Session

    def _handle_response(
        self, response: requests.Response, response_model: type[T]
    ) -> T: ...
