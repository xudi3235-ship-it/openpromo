from google.protobuf.internal import containers as _containers
from google.protobuf.internal import enum_type_wrapper as _enum_type_wrapper
from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from collections.abc import Iterable as _Iterable, Mapping as _Mapping
from typing import ClassVar as _ClassVar, Optional as _Optional, Union as _Union

DESCRIPTOR: _descriptor.FileDescriptor

class AspectRatio(int, metaclass=_enum_type_wrapper.EnumTypeWrapper):
    __slots__ = ()
    ASPECT_RATIO_UNSPECIFIED: _ClassVar[AspectRatio]
    ASPECT_RATIO_16_9: _ClassVar[AspectRatio]
    ASPECT_RATIO_4_3: _ClassVar[AspectRatio]
    ASPECT_RATIO_1_1: _ClassVar[AspectRatio]

class Cadence(int, metaclass=_enum_type_wrapper.EnumTypeWrapper):
    __slots__ = ()
    CADENCE_UNSPECIFIED: _ClassVar[Cadence]
    CADENCE_DAILY: _ClassVar[Cadence]
    CADENCE_WEEKLY: _ClassVar[Cadence]
    CADENCE_MONTHLY: _ClassVar[Cadence]

class JobStatus(int, metaclass=_enum_type_wrapper.EnumTypeWrapper):
    __slots__ = ()
    JOB_STATUS_UNSPECIFIED: _ClassVar[JobStatus]
    JOB_STATUS_PENDING: _ClassVar[JobStatus]
    JOB_STATUS_SUCCEEDED: _ClassVar[JobStatus]
    JOB_STATUS_FAILED: _ClassVar[JobStatus]

class JobFunction(int, metaclass=_enum_type_wrapper.EnumTypeWrapper):
    __slots__ = ()
    JOB_FUNCTION_UNSPECIFIED: _ClassVar[JobFunction]
    JOB_FUNCTION_EDIT_VIDEO: _ClassVar[JobFunction]
    JOB_FUNCTION_AGENT_VIDEO: _ClassVar[JobFunction]

class VideoGenStatus(int, metaclass=_enum_type_wrapper.EnumTypeWrapper):
    __slots__ = ()
    VIDEO_GEN_STATUS_UNSPECIFIED: _ClassVar[VideoGenStatus]
    VIDEO_GEN_STATUS_SUCCESS: _ClassVar[VideoGenStatus]
    VIDEO_GEN_STATUS_FAILED: _ClassVar[VideoGenStatus]
    VIDEO_GEN_STATUS_IN_PROGRESS: _ClassVar[VideoGenStatus]

class AgentOutputStatus(int, metaclass=_enum_type_wrapper.EnumTypeWrapper):
    __slots__ = ()
    AGENT_OUTPUT_STATUS_UNSPECIFIED: _ClassVar[AgentOutputStatus]
    AGENT_OUTPUT_STATUS_SUCCESS: _ClassVar[AgentOutputStatus]
    AGENT_OUTPUT_STATUS_ERROR: _ClassVar[AgentOutputStatus]
ASPECT_RATIO_UNSPECIFIED: AspectRatio
ASPECT_RATIO_16_9: AspectRatio
ASPECT_RATIO_4_3: AspectRatio
ASPECT_RATIO_1_1: AspectRatio
CADENCE_UNSPECIFIED: Cadence
CADENCE_DAILY: Cadence
CADENCE_WEEKLY: Cadence
CADENCE_MONTHLY: Cadence
JOB_STATUS_UNSPECIFIED: JobStatus
JOB_STATUS_PENDING: JobStatus
JOB_STATUS_SUCCEEDED: JobStatus
JOB_STATUS_FAILED: JobStatus
JOB_FUNCTION_UNSPECIFIED: JobFunction
JOB_FUNCTION_EDIT_VIDEO: JobFunction
JOB_FUNCTION_AGENT_VIDEO: JobFunction
VIDEO_GEN_STATUS_UNSPECIFIED: VideoGenStatus
VIDEO_GEN_STATUS_SUCCESS: VideoGenStatus
VIDEO_GEN_STATUS_FAILED: VideoGenStatus
VIDEO_GEN_STATUS_IN_PROGRESS: VideoGenStatus
AGENT_OUTPUT_STATUS_UNSPECIFIED: AgentOutputStatus
AGENT_OUTPUT_STATUS_SUCCESS: AgentOutputStatus
AGENT_OUTPUT_STATUS_ERROR: AgentOutputStatus

class EditVideoJobRequest(_message.Message):
    __slots__ = ()
    INPUT_URL_FIELD_NUMBER: _ClassVar[int]
    ASPECT_RATIO_FIELD_NUMBER: _ClassVar[int]
    CADENCE_FIELD_NUMBER: _ClassVar[int]
    input_url: str
    aspect_ratio: AspectRatio
    cadence: Cadence
    def __init__(self, input_url: _Optional[str] = ..., aspect_ratio: _Optional[_Union[AspectRatio, str]] = ..., cadence: _Optional[_Union[Cadence, str]] = ...) -> None: ...

class AgentVideoJobRequest(_message.Message):
    __slots__ = ()
    PRODUCT_FIELD_NUMBER: _ClassVar[int]
    PRODUCT_IMGS_FIELD_NUMBER: _ClassVar[int]
    AVATAR_IMGS_FIELD_NUMBER: _ClassVar[int]
    BUSINESS_FIELD_NUMBER: _ClassVar[int]
    USER_MESSAGE_FIELD_NUMBER: _ClassVar[int]
    MAX_TURNS_FIELD_NUMBER: _ClassVar[int]
    product: str
    product_imgs: _containers.RepeatedScalarFieldContainer[str]
    avatar_imgs: _containers.RepeatedScalarFieldContainer[str]
    business: str
    user_message: str
    max_turns: int
    def __init__(self, product: _Optional[str] = ..., product_imgs: _Optional[_Iterable[str]] = ..., avatar_imgs: _Optional[_Iterable[str]] = ..., business: _Optional[str] = ..., user_message: _Optional[str] = ..., max_turns: _Optional[int] = ...) -> None: ...

class JobSubmitResponse(_message.Message):
    __slots__ = ()
    CALL_ID_FIELD_NUMBER: _ClassVar[int]
    call_id: str
    def __init__(self, call_id: _Optional[str] = ...) -> None: ...

class JobResultRequest(_message.Message):
    __slots__ = ()
    CALL_ID_FIELD_NUMBER: _ClassVar[int]
    call_id: str
    def __init__(self, call_id: _Optional[str] = ...) -> None: ...

class VideoEditResult(_message.Message):
    __slots__ = ()
    OUTPUT_URL_FIELD_NUMBER: _ClassVar[int]
    output_url: str
    def __init__(self, output_url: _Optional[str] = ...) -> None: ...

class AgentVideoGenSuccessOut(_message.Message):
    __slots__ = ()
    VIDEO_URL_FIELD_NUMBER: _ClassVar[int]
    SUMMARY_FIELD_NUMBER: _ClassVar[int]
    video_url: str
    summary: str
    def __init__(self, video_url: _Optional[str] = ..., summary: _Optional[str] = ...) -> None: ...

class AgentVideoGenErrorOut(_message.Message):
    __slots__ = ()
    ERROR_MESSAGE_FIELD_NUMBER: _ClassVar[int]
    ERROR_TYPE_FIELD_NUMBER: _ClassVar[int]
    error_message: str
    error_type: str
    def __init__(self, error_message: _Optional[str] = ..., error_type: _Optional[str] = ...) -> None: ...

class AgentVideoGenOutput(_message.Message):
    __slots__ = ()
    STATUS_FIELD_NUMBER: _ClassVar[int]
    SUCCESS_FIELD_NUMBER: _ClassVar[int]
    ERROR_FIELD_NUMBER: _ClassVar[int]
    status: AgentOutputStatus
    success: AgentVideoGenSuccessOut
    error: AgentVideoGenErrorOut
    def __init__(self, status: _Optional[_Union[AgentOutputStatus, str]] = ..., success: _Optional[_Union[AgentVideoGenSuccessOut, _Mapping]] = ..., error: _Optional[_Union[AgentVideoGenErrorOut, _Mapping]] = ...) -> None: ...

class VideoGenFailResult(_message.Message):
    __slots__ = ()
    ERROR_FIELD_NUMBER: _ClassVar[int]
    error: str
    def __init__(self, error: _Optional[str] = ...) -> None: ...

class VideoGenInProgressResult(_message.Message):
    __slots__ = ()
    PROGRESS_FIELD_NUMBER: _ClassVar[int]
    MESSAGE_FIELD_NUMBER: _ClassVar[int]
    progress: float
    message: str
    def __init__(self, progress: _Optional[float] = ..., message: _Optional[str] = ...) -> None: ...

class VideoGenSuccessResult(_message.Message):
    __slots__ = ()
    OUT_FIELD_NUMBER: _ClassVar[int]
    out: AgentVideoGenOutput
    def __init__(self, out: _Optional[_Union[AgentVideoGenOutput, _Mapping]] = ...) -> None: ...

class JobResultResponse(_message.Message):
    __slots__ = ()
    FN_FIELD_NUMBER: _ClassVar[int]
    STATUS_FIELD_NUMBER: _ClassVar[int]
    ERROR_FIELD_NUMBER: _ClassVar[int]
    EDIT_RESULT_FIELD_NUMBER: _ClassVar[int]
    VIDEO_GEN_RESULT_FIELD_NUMBER: _ClassVar[int]
    fn: JobFunction
    status: JobStatus
    error: str
    edit_result: VideoEditResult
    video_gen_result: VideoGenSuccessResult
    def __init__(self, fn: _Optional[_Union[JobFunction, str]] = ..., status: _Optional[_Union[JobStatus, str]] = ..., error: _Optional[str] = ..., edit_result: _Optional[_Union[VideoEditResult, _Mapping]] = ..., video_gen_result: _Optional[_Union[VideoGenSuccessResult, _Mapping]] = ...) -> None: ...

class VideoGenerateRequest(_message.Message):
    __slots__ = ()
    PRODUCT_FIELD_NUMBER: _ClassVar[int]
    PRODUCT_IMGS_FIELD_NUMBER: _ClassVar[int]
    AVATAR_IMGS_FIELD_NUMBER: _ClassVar[int]
    BUSINESS_FIELD_NUMBER: _ClassVar[int]
    USER_MESSAGE_FIELD_NUMBER: _ClassVar[int]
    MAX_TURNS_FIELD_NUMBER: _ClassVar[int]
    product: str
    product_imgs: _containers.RepeatedScalarFieldContainer[str]
    avatar_imgs: _containers.RepeatedScalarFieldContainer[str]
    business: str
    user_message: str
    max_turns: int
    def __init__(self, product: _Optional[str] = ..., product_imgs: _Optional[_Iterable[str]] = ..., avatar_imgs: _Optional[_Iterable[str]] = ..., business: _Optional[str] = ..., user_message: _Optional[str] = ..., max_turns: _Optional[int] = ...) -> None: ...

class VideoGenerateResponse(_message.Message):
    __slots__ = ()
    STATUS_FIELD_NUMBER: _ClassVar[int]
    SUCCESS_FIELD_NUMBER: _ClassVar[int]
    FAIL_FIELD_NUMBER: _ClassVar[int]
    IN_PROGRESS_FIELD_NUMBER: _ClassVar[int]
    status: VideoGenStatus
    success: VideoGenSuccessResult
    fail: VideoGenFailResult
    in_progress: VideoGenInProgressResult
    def __init__(self, status: _Optional[_Union[VideoGenStatus, str]] = ..., success: _Optional[_Union[VideoGenSuccessResult, _Mapping]] = ..., fail: _Optional[_Union[VideoGenFailResult, _Mapping]] = ..., in_progress: _Optional[_Union[VideoGenInProgressResult, _Mapping]] = ...) -> None: ...
