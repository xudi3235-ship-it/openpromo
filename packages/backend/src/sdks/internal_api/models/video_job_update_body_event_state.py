from enum import Enum


class VideoJobUpdateBodyEventState(str, Enum):
    COMPLETED = "completed"
    FAILED = "failed"
    PROCESSING = "processing"
    QUEUED = "queued"

    def __str__(self) -> str:
        return str(self.value)
