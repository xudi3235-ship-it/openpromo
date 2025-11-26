from google.protobuf.internal import containers as _containers
from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from collections.abc import Iterable as _Iterable
from typing import ClassVar as _ClassVar, Optional as _Optional

DESCRIPTOR: _descriptor.FileDescriptor

class FFprobeRequest(_message.Message):
    __slots__ = ()
    INPUT_URL_FIELD_NUMBER: _ClassVar[int]
    CMD_FIELD_NUMBER: _ClassVar[int]
    input_url: str
    cmd: _containers.RepeatedScalarFieldContainer[str]
    def __init__(self, input_url: _Optional[str] = ..., cmd: _Optional[_Iterable[str]] = ...) -> None: ...

class FFprobeResponse(_message.Message):
    __slots__ = ()
    OUTPUT_FIELD_NUMBER: _ClassVar[int]
    ERROR_FIELD_NUMBER: _ClassVar[int]
    output: str
    error: str
    def __init__(self, output: _Optional[str] = ..., error: _Optional[str] = ...) -> None: ...
