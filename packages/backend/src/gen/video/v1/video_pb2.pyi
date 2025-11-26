from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from typing import ClassVar as _ClassVar, Optional as _Optional

DESCRIPTOR: _descriptor.FileDescriptor

class TranscodeRequest(_message.Message):
    __slots__ = ()
    INPUT_URL_FIELD_NUMBER: _ClassVar[int]
    PLATFORM_FIELD_NUMBER: _ClassVar[int]
    input_url: str
    platform: str
    def __init__(self, input_url: _Optional[str] = ..., platform: _Optional[str] = ...) -> None: ...

class TranscodeResponse(_message.Message):
    __slots__ = ()
    OUTPUT_URL_FIELD_NUMBER: _ClassVar[int]
    TRANSCODED_FIELD_NUMBER: _ClassVar[int]
    ERROR_FIELD_NUMBER: _ClassVar[int]
    output_url: str
    transcoded: bool
    error: str
    def __init__(self, output_url: _Optional[str] = ..., transcoded: _Optional[bool] = ..., error: _Optional[str] = ...) -> None: ...
