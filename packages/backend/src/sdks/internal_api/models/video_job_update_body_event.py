from __future__ import annotations

from collections.abc import Mapping
from typing import Any, Literal, TypeVar, cast

from attrs import define as _attrs_define

from ..models.video_job_update_body_event_state import VideoJobUpdateBodyEventState
from ..types import UNSET, Unset

T = TypeVar("T", bound="VideoJobUpdateBodyEvent")


@_attrs_define
class VideoJobUpdateBodyEvent:
    """WebSocket event fired when a video generation job is updated.
    This is what clients receive via WorkspacePusher.

    Modal sends this directly to the CF worker, which passes it through
    to the WebSocket without transformation.

        Attributes:
            job_id (str): The video generation job ID
            state (VideoJobUpdateBodyEventState): Current state of the job
            timestamp (float): Unix timestamp in milliseconds
            type_ (Literal['video_generation.updated'] | Unset): Event type discriminator Default:
                'video_generation.updated'.
            progress (float | None | Unset): Progress percentage (0-100), only for processing state
            message (None | str | Unset): Status message or error description
            output_url (None | str | Unset): URL of the generated video, only for completed state
    """

    job_id: str
    state: VideoJobUpdateBodyEventState
    timestamp: float
    type_: Literal["video_generation.updated"] | Unset = "video_generation.updated"
    progress: float | None | Unset = UNSET
    message: None | str | Unset = UNSET
    output_url: None | str | Unset = UNSET

    def to_dict(self) -> dict[str, Any]:
        job_id = self.job_id

        state = self.state.value

        timestamp = self.timestamp

        type_ = self.type_

        progress: float | None | Unset
        if isinstance(self.progress, Unset):
            progress = UNSET
        else:
            progress = self.progress

        message: None | str | Unset
        if isinstance(self.message, Unset):
            message = UNSET
        else:
            message = self.message

        output_url: None | str | Unset
        if isinstance(self.output_url, Unset):
            output_url = UNSET
        else:
            output_url = self.output_url

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "job_id": job_id,
                "state": state,
                "timestamp": timestamp,
            }
        )
        if type_ is not UNSET:
            field_dict["type"] = type_
        if progress is not UNSET:
            field_dict["progress"] = progress
        if message is not UNSET:
            field_dict["message"] = message
        if output_url is not UNSET:
            field_dict["output_url"] = output_url

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        job_id = d.pop("job_id")

        state = VideoJobUpdateBodyEventState(d.pop("state"))

        timestamp = d.pop("timestamp")

        type_ = cast(Literal["video_generation.updated"] | Unset, d.pop("type", UNSET))
        if type_ != "video_generation.updated" and not isinstance(type_, Unset):
            raise ValueError(f"type must match const 'video_generation.updated', got '{type_}'")

        def _parse_progress(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        progress = _parse_progress(d.pop("progress", UNSET))

        def _parse_message(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        message = _parse_message(d.pop("message", UNSET))

        def _parse_output_url(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        output_url = _parse_output_url(d.pop("output_url", UNSET))

        video_job_update_body_event = cls(
            job_id=job_id,
            state=state,
            timestamp=timestamp,
            type_=type_,
            progress=progress,
            message=message,
            output_url=output_url,
        )

        return video_job_update_body_event
