from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define

if TYPE_CHECKING:
    from ..models.video_job_update_body_event import VideoJobUpdateBodyEvent


T = TypeVar("T", bound="VideoJobUpdateBody")


@_attrs_define
class VideoJobUpdateBody:
    """Request body for video generation job updates.

    Modal sends this to the CF worker's internal endpoint.
    The CF worker broadcasts the event directly to WebSocket.

        Attributes:
            workspace_id (str): The workspace ID to send the update to
            event (VideoJobUpdateBodyEvent): WebSocket event fired when a video generation job is updated.
                This is what clients receive via WorkspacePusher.

                Modal sends this directly to the CF worker, which passes it through
                to the WebSocket without transformation.
    """

    workspace_id: str
    event: VideoJobUpdateBodyEvent

    def to_dict(self) -> dict[str, Any]:
        workspace_id = self.workspace_id

        event = self.event.to_dict()

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "workspace_id": workspace_id,
                "event": event,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.video_job_update_body_event import VideoJobUpdateBodyEvent

        d = dict(src_dict)
        workspace_id = d.pop("workspace_id")

        event = VideoJobUpdateBodyEvent.from_dict(d.pop("event"))

        video_job_update_body = cls(
            workspace_id=workspace_id,
            event=event,
        )

        return video_job_update_body
