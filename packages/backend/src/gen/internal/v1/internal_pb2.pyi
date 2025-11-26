from google.protobuf.internal import enum_type_wrapper as _enum_type_wrapper
from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from collections.abc import Mapping as _Mapping
from typing import ClassVar as _ClassVar, Optional as _Optional, Union as _Union

DESCRIPTOR: _descriptor.FileDescriptor

class VideoJobState(int, metaclass=_enum_type_wrapper.EnumTypeWrapper):
    __slots__ = ()
    VIDEO_JOB_STATE_UNSPECIFIED: _ClassVar[VideoJobState]
    VIDEO_JOB_STATE_PROCESSING: _ClassVar[VideoJobState]
    VIDEO_JOB_STATE_COMPLETED: _ClassVar[VideoJobState]
    VIDEO_JOB_STATE_FAILED: _ClassVar[VideoJobState]
VIDEO_JOB_STATE_UNSPECIFIED: VideoJobState
VIDEO_JOB_STATE_PROCESSING: VideoJobState
VIDEO_JOB_STATE_COMPLETED: VideoJobState
VIDEO_JOB_STATE_FAILED: VideoJobState

class VideoJobEvent(_message.Message):
    __slots__ = ()
    JOB_ID_FIELD_NUMBER: _ClassVar[int]
    STATE_FIELD_NUMBER: _ClassVar[int]
    TIMESTAMP_FIELD_NUMBER: _ClassVar[int]
    PROGRESS_FIELD_NUMBER: _ClassVar[int]
    MESSAGE_FIELD_NUMBER: _ClassVar[int]
    OUTPUT_URL_FIELD_NUMBER: _ClassVar[int]
    job_id: str
    state: VideoJobState
    timestamp: float
    progress: float
    message: str
    output_url: str
    def __init__(self, job_id: _Optional[str] = ..., state: _Optional[_Union[VideoJobState, str]] = ..., timestamp: _Optional[float] = ..., progress: _Optional[float] = ..., message: _Optional[str] = ..., output_url: _Optional[str] = ...) -> None: ...

class VideoJobUpdateRequest(_message.Message):
    __slots__ = ()
    WORKSPACE_ID_FIELD_NUMBER: _ClassVar[int]
    EVENT_FIELD_NUMBER: _ClassVar[int]
    workspace_id: str
    event: VideoJobEvent
    def __init__(self, workspace_id: _Optional[str] = ..., event: _Optional[_Union[VideoJobEvent, _Mapping]] = ...) -> None: ...

class VideoJobUpdateResponse(_message.Message):
    __slots__ = ()
    SUCCESS_FIELD_NUMBER: _ClassVar[int]
    success: bool
    def __init__(self, success: _Optional[bool] = ...) -> None: ...
