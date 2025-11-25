from typing import Any

from pydantic import BaseModel, ConfigDict, Field, ValidationError


class TaskResultPayload(BaseModel):
    """Decoded payload for job task result_json content."""

    result_urls: list[str] = Field(
        default_factory=list,
        alias="resultUrls",
        description="Generated media URLs returned by the task",
    )
    origin_urls: list[str] = Field(
        default_factory=list,
        alias="originUrls",
        description="Original-quality URLs returned when available",
    )

    model_config = ConfigDict(populate_by_name=True)


def parse_task_result_payload(
    result_json: str | dict[str, Any] | None,
) -> TaskResultPayload | None:
    """Return a strongly typed payload object parsed from result_json."""

    if not result_json:
        return None

    try:
        if isinstance(result_json, str):
            return TaskResultPayload.model_validate_json(result_json)
        return TaskResultPayload.model_validate(result_json)
    except ValidationError:
        return TaskResultPayload()
