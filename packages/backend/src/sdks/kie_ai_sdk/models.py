"""Data models and enums for KIE.AI SDK."""

from enum import Enum
from typing import Any, ClassVar

from pydantic import BaseModel, ConfigDict, Field, field_validator


class AspectRatio(str, Enum):
    """Video aspect ratio options."""

    LANDSCAPE = "16:9"
    PORTRAIT = "9:16"
    AUTO = "Auto"


class GenerationType(str, Enum):
    """Video generation mode."""

    TEXT_2_VIDEO = "TEXT_2_VIDEO"
    FIRST_AND_LAST_FRAMES_2_VIDEO = "FIRST_AND_LAST_FRAMES_2_VIDEO"
    REFERENCE_2_VIDEO = "REFERENCE_2_VIDEO"


class Model(str, Enum):
    """Veo 3.1 model types."""

    VEO3 = "veo3"  # Quality model
    VEO3_FAST = "veo3_fast"  # Fast model


class TaskStatus(int, Enum):
    """Task status codes."""

    GENERATING = 0
    SUCCESS = 1
    FAILED = 2
    GENERATION_FAILED = 3


# ===== REQUEST MODELS =====


class GenerateVideoRequest(BaseModel):
    """Request model for video generation."""

    model_config: ClassVar[ConfigDict] = ConfigDict(use_enum_values=True)

    prompt: str = Field(
        ..., description="Text prompt describing the desired video content"
    )
    image_urls: list[str] | None = Field(
        None,
        alias="imageUrls",
        description="Image URLs for image-to-video (1-2 images)",
    )
    model: Model = Field(Model.VEO3_FAST, description="Model type")
    generation_type: GenerationType | None = Field(
        None, alias="generationType", description="Video generation mode"
    )
    aspect_ratio: AspectRatio = Field(
        AspectRatio.LANDSCAPE, alias="aspectRatio", description="Video aspect ratio"
    )
    seeds: int | None = Field(
        None, ge=10000, le=99999, description="Random seed for reproducibility"
    )
    callback_url: str | None = Field(
        None, alias="callBackUrl", description="Completion callback URL"
    )
    enable_translation: bool = Field(
        True, alias="enableTranslation", description="Auto-translate prompts to English"
    )
    watermark: str | None = Field(None, description="Watermark text")

    @field_validator("image_urls")
    @classmethod
    def validate_image_urls(cls, v: list[str] | None) -> list[str] | None:
        if v is not None and len(v) > 2:
            raise ValueError("Maximum 2 image URLs allowed")
        return v


class ExtendVideoRequest(BaseModel):
    """Request model for video extension."""

    model_config: ClassVar[ConfigDict] = ConfigDict(use_enum_values=True)

    task_id: str = Field(
        ..., alias="taskId", description="Task ID of the original video"
    )
    prompt: str = Field(..., description="Description of how to extend the video")
    seeds: int | None = Field(
        None, ge=10000, le=99999, description="Random seed for reproducibility"
    )
    watermark: str | None = Field(None, description="Watermark text")
    callback_url: str | None = Field(
        None, alias="callBackUrl", description="Completion callback URL"
    )


class UploadFileBase64Request(BaseModel):
    """Request model for Base64 file upload."""

    base64_data: str = Field(
        ..., alias="base64Data", description="Base64 encoded file data"
    )
    upload_path: str = Field(
        ...,
        alias="uploadPath",
        description="Upload path without leading/trailing slashes",
    )
    file_name: str | None = Field(
        None, alias="fileName", description="Optional filename with extension"
    )


class UploadFileUrlRequest(BaseModel):
    """Request model for URL file upload."""

    file_url: str = Field(
        ..., alias="fileUrl", description="HTTP/HTTPS URL of the file"
    )
    upload_path: str = Field(
        ...,
        alias="uploadPath",
        description="Upload path without leading/trailing slashes",
    )
    file_name: str | None = Field(
        None, alias="fileName", description="Optional filename with extension"
    )


class GetDownloadUrlRequest(BaseModel):
    """Request model for getting download URL."""

    url: str = Field(..., description="Generated file URL from kie.ai services")


# ===== RESPONSE MODELS =====


class TaskResponse(BaseModel):
    """Response for task creation."""

    task_id: str = Field(..., alias="taskId", description="Task ID for tracking")


class VideoResponse(BaseModel):
    """Video generation response details."""

    task_id: str = Field(..., alias="taskId", description="Task ID")
    result_urls: list[str] = Field(
        default_factory=list, alias="resultUrls", description="Generated video URLs"
    )
    origin_urls: list[str] = Field(
        default_factory=list,
        alias="originUrls",
        description="Original quality video URLs",
    )
    resolution: str | None = Field(None, description="Video resolution")


class VideoDetailsData(BaseModel):
    """Detailed video task information."""

    model_config: ClassVar[ConfigDict] = ConfigDict(populate_by_name=True)

    task_id: str = Field(..., alias="taskId", description="Task ID")
    param_json: str | None = Field(
        None, alias="paramJson", description="JSON string of parameters"
    )
    complete_time: str | None = Field(
        None, alias="completeTime", description="Completion timestamp"
    )
    response: VideoResponse | None = Field(None, description="Video response details")
    success_flag: int = Field(
        ...,
        alias="successFlag",
        description="Status: 0=generating, 1=success, 2=failed, 3=generation_failed",
    )
    error_code: str | None = Field(
        None, alias="errorCode", description="Error code if failed"
    )
    error_message: str = Field(
        default="", alias="errorMessage", description="Error message if failed"
    )
    create_time: str | None = Field(
        None, alias="createTime", description="Creation timestamp"
    )
    fallback_flag: bool = Field(
        False, alias="fallbackFlag", description="Whether fallback model was used"
    )


class Video1080pData(BaseModel):
    """1080P video response."""

    result_url: str = Field(..., alias="resultUrl", description="1080P video URL")


class FileUploadData(BaseModel):
    """File upload response data."""

    model_config: ClassVar[ConfigDict] = ConfigDict(populate_by_name=True)

    file_name: str = Field(..., alias="fileName", description="Uploaded file name")
    file_path: str = Field(..., alias="filePath", description="File path on server")
    download_url: str = Field(..., alias="downloadUrl", description="Download URL")
    file_size: int = Field(..., alias="fileSize", description="File size in bytes")
    mime_type: str = Field(..., alias="mimeType", description="MIME type")
    uploaded_at: str = Field(..., alias="uploadedAt", description="Upload timestamp")


class ApiResponse(BaseModel):
    """Generic API response wrapper."""

    model_config: ClassVar[ConfigDict] = ConfigDict(populate_by_name=True)

    code: int = Field(..., description="Response status code")
    msg: str = Field(..., description="Response message")
    data: Any | None = Field(None, description="Response data")


class GenerateVideoResponse(ApiResponse):
    """Video generation response."""

    data: TaskResponse | None = None


class ExtendVideoResponse(ApiResponse):
    """Video extension response."""

    data: TaskResponse | None = None


class VideoDetailsResponse(ApiResponse):
    """Video details response."""

    data: VideoDetailsData | None = None


class Video1080pResponse(ApiResponse):
    """1080P video response."""

    data: Video1080pData | None = None


class FileUploadResponse(ApiResponse):
    """File upload response."""

    data: FileUploadData | None = None


class CreditsResponse(ApiResponse):
    """Credits response."""

    data: int | None = None


class DownloadUrlResponse(ApiResponse):
    """Download URL response."""

    data: str | None = None
