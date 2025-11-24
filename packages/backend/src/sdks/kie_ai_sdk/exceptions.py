"""Exception classes for KIE.AI SDK."""

from typing import Any


class KieAIException(Exception):
    """Base exception for KIE.AI SDK errors."""

    def __init__(self, code: int, message: str, response: dict[str, Any] | None = None):
        self.code: int = code
        self.message: str = message
        self.response: dict[str, Any] | None = response
        super().__init__(f"[{code}] {message}")
