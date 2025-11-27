from collections.abc import Iterable as _Iterable
from collections.abc import Mapping as _Mapping
from typing import ClassVar as _ClassVar
from typing import Optional as _Optional
from typing import Union as _Union

from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from google.protobuf.internal import containers as _containers
from google.protobuf.internal import enum_type_wrapper as _enum_type_wrapper

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

class JobFunction(int, metaclass=_enum_type_wrapper.EnumTypeWrapper):
    __slots__ = ()
    JOB_FUNCTION_UNSPECIFIED: _ClassVar[JobFunction]
    JOB_FUNCTION_EDIT_VIDEO: _ClassVar[JobFunction]
    JOB_FUNCTION_AGENT_VIDEO: _ClassVar[JobFunction]

class JobState(int, metaclass=_enum_type_wrapper.EnumTypeWrapper):
    __slots__ = ()
    JOB_STATE_UNSPECIFIED: _ClassVar[JobState]
    JOB_STATE_PENDING: _ClassVar[JobState]
    JOB_STATE_IN_PROGRESS: _ClassVar[JobState]
    JOB_STATE_SUCCEEDED: _ClassVar[JobState]
    JOB_STATE_FAILED: _ClassVar[JobState]

ASPECT_RATIO_UNSPECIFIED: AspectRatio
ASPECT_RATIO_16_9: AspectRatio
ASPECT_RATIO_4_3: AspectRatio
ASPECT_RATIO_1_1: AspectRatio
CADENCE_UNSPECIFIED: Cadence
CADENCE_DAILY: Cadence
CADENCE_WEEKLY: Cadence
CADENCE_MONTHLY: Cadence
JOB_FUNCTION_UNSPECIFIED: JobFunction
JOB_FUNCTION_EDIT_VIDEO: JobFunction
JOB_FUNCTION_AGENT_VIDEO: JobFunction
JOB_STATE_UNSPECIFIED: JobState
JOB_STATE_PENDING: JobState
JOB_STATE_IN_PROGRESS: JobState
JOB_STATE_SUCCEEDED: JobState
JOB_STATE_FAILED: JobState

class JobEnvelope(_message.Message):
    __slots__ = ()
    FN_FIELD_NUMBER: _ClassVar[int]
    WORKSPACE_ID_FIELD_NUMBER: _ClassVar[int]
    CLIENT_JOB_ID_FIELD_NUMBER: _ClassVar[int]
    fn: JobFunction
    workspace_id: str
    client_job_id: str
    def __init__(
        self,
        fn: _Optional[_Union[JobFunction, str]] = ...,
        workspace_id: _Optional[str] = ...,
        client_job_id: _Optional[str] = ...,
    ) -> None: ...

class JobMetadata(_message.Message):
    __slots__ = ()
    CALL_ID_FIELD_NUMBER: _ClassVar[int]
    FN_FIELD_NUMBER: _ClassVar[int]
    WORKSPACE_ID_FIELD_NUMBER: _ClassVar[int]
    CREATED_AT_EPOCH_MS_FIELD_NUMBER: _ClassVar[int]
    UPDATED_AT_EPOCH_MS_FIELD_NUMBER: _ClassVar[int]
    call_id: str
    fn: JobFunction
    workspace_id: str
    created_at_epoch_ms: int
    updated_at_epoch_ms: int
    def __init__(
        self,
        call_id: _Optional[str] = ...,
        fn: _Optional[_Union[JobFunction, str]] = ...,
        workspace_id: _Optional[str] = ...,
        created_at_epoch_ms: _Optional[int] = ...,
        updated_at_epoch_ms: _Optional[int] = ...,
    ) -> None: ...

class EditVideoJobRequest(_message.Message):
    __slots__ = ()
    ENVELOPE_FIELD_NUMBER: _ClassVar[int]
    INPUT_URL_FIELD_NUMBER: _ClassVar[int]
    ASPECT_RATIO_FIELD_NUMBER: _ClassVar[int]
    CADENCE_FIELD_NUMBER: _ClassVar[int]
    WAIT_FOR_COMPLETION_FIELD_NUMBER: _ClassVar[int]
    envelope: JobEnvelope
    input_url: str
    aspect_ratio: AspectRatio
    cadence: Cadence
    wait_for_completion: bool
    def __init__(
        self,
        envelope: _Optional[_Union[JobEnvelope, _Mapping]] = ...,
        input_url: _Optional[str] = ...,
        aspect_ratio: _Optional[_Union[AspectRatio, str]] = ...,
        cadence: _Optional[_Union[Cadence, str]] = ...,
        wait_for_completion: _Optional[bool] = ...,
    ) -> None: ...

class AgentVideoJobRequest(_message.Message):
    __slots__ = ()
    ENVELOPE_FIELD_NUMBER: _ClassVar[int]
    PRODUCT_FIELD_NUMBER: _ClassVar[int]
    PRODUCT_IMGS_FIELD_NUMBER: _ClassVar[int]
    AVATAR_IMGS_FIELD_NUMBER: _ClassVar[int]
    BUSINESS_FIELD_NUMBER: _ClassVar[int]
    USER_MESSAGE_FIELD_NUMBER: _ClassVar[int]
    MAX_TURNS_FIELD_NUMBER: _ClassVar[int]
    WAIT_FOR_COMPLETION_FIELD_NUMBER: _ClassVar[int]
    envelope: JobEnvelope
    product: str
    product_imgs: _containers.RepeatedScalarFieldContainer[str]
    avatar_imgs: _containers.RepeatedScalarFieldContainer[str]
    business: str
    user_message: str
    max_turns: int
    wait_for_completion: bool
    def __init__(
        self,
        envelope: _Optional[_Union[JobEnvelope, _Mapping]] = ...,
        product: _Optional[str] = ...,
        product_imgs: _Optional[_Iterable[str]] = ...,
        avatar_imgs: _Optional[_Iterable[str]] = ...,
        business: _Optional[str] = ...,
        user_message: _Optional[str] = ...,
        max_turns: _Optional[int] = ...,
        wait_for_completion: _Optional[bool] = ...,
    ) -> None: ...

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

class EditVideoJobPayload(_message.Message):
    __slots__ = ()
    OUTPUT_URL_FIELD_NUMBER: _ClassVar[int]
    PROGRESS_FIELD_NUMBER: _ClassVar[int]
    PROGRESS_MESSAGE_FIELD_NUMBER: _ClassVar[int]
    output_url: str
    progress: float
    progress_message: str
    def __init__(
        self,
        output_url: _Optional[str] = ...,
        progress: _Optional[float] = ...,
        progress_message: _Optional[str] = ...,
    ) -> None: ...

class AgentVideoJobPayload(_message.Message):
    __slots__ = ()
    VIDEO_URL_FIELD_NUMBER: _ClassVar[int]
    SUMMARY_FIELD_NUMBER: _ClassVar[int]
    PROGRESS_FIELD_NUMBER: _ClassVar[int]
    PROGRESS_MESSAGE_FIELD_NUMBER: _ClassVar[int]
    video_url: str
    summary: str
    progress: float
    progress_message: str
    def __init__(
        self,
        video_url: _Optional[str] = ...,
        summary: _Optional[str] = ...,
        progress: _Optional[float] = ...,
        progress_message: _Optional[str] = ...,
    ) -> None: ...

class JobResultResponse(_message.Message):
    __slots__ = ()
    METADATA_FIELD_NUMBER: _ClassVar[int]
    STATE_FIELD_NUMBER: _ClassVar[int]
    ERROR_CODE_FIELD_NUMBER: _ClassVar[int]
    ERROR_MESSAGE_FIELD_NUMBER: _ClassVar[int]
    EDIT_VIDEO_FIELD_NUMBER: _ClassVar[int]
    AGENT_VIDEO_FIELD_NUMBER: _ClassVar[int]
    metadata: JobMetadata
    state: JobState
    error_code: str
    error_message: str
    edit_video: EditVideoJobPayload
    agent_video: AgentVideoJobPayload
    def __init__(
        self,
        metadata: _Optional[_Union[JobMetadata, _Mapping]] = ...,
        state: _Optional[_Union[JobState, str]] = ...,
        error_code: _Optional[str] = ...,
        error_message: _Optional[str] = ...,
        edit_video: _Optional[_Union[EditVideoJobPayload, _Mapping]] = ...,
        agent_video: _Optional[_Union[AgentVideoJobPayload, _Mapping]] = ...,
    ) -> None: ...
