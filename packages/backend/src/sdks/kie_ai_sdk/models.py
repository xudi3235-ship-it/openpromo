"""Data models and enums for KIE.AI SDK."""

from enum import Enum
from typing import Any, ClassVar, TypeAlias

from pydantic import BaseModel, ConfigDict, Field, field_validator

Timestamp: TypeAlias = str | int
TimestampInput: TypeAlias = Timestamp | None


def coerce_timestamp(value: TimestampInput) -> Timestamp | None:
    if value is None:
        return None
    if isinstance(value, int):
        return value

    normalized = str(value).strip()
    if normalized.isdigit():
        return int(normalized)

    return normalized


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


class TaskState(str, Enum):
    """Job task states."""

    WAITING = "waiting"
    QUEUING = "queuing"
    GENERATING = "generating"
    SUCCESS = "success"
    FAIL = "fail"


class FrameDuration(str, Enum):
    """Video frame duration options for storyboard."""

    TEN_SECONDS = "10"
    FIFTEEN_SECONDS = "15"
    TWENTY_FIVE_SECONDS = "25"


class StoryboardAspectRatio(str, Enum):
    """Aspect ratio options for storyboard videos."""

    PORTRAIT = "portrait"
    LANDSCAPE = "landscape"


class ByteDanceResolution(str, Enum):
    """Resolution options for ByteDance video generation."""

    R_720P = "720p"
    R_1080P = "1080p"


class ByteDanceDuration(str, Enum):
    """Duration options for ByteDance video generation."""

    FIVE_SECONDS = "5"
    TEN_SECONDS = "10"


class NanoBananaAspectRatio(str, Enum):
    """Aspect ratio options for Nano Banana Pro."""

    SQUARE = "1:1"
    PORTRAIT_2_3 = "2:3"
    LANDSCAPE_3_2 = "3:2"
    PORTRAIT_3_4 = "3:4"
    LANDSCAPE_4_3 = "4:3"
    PORTRAIT_4_5 = "4:5"
    LANDSCAPE_5_4 = "5:4"
    PORTRAIT_9_16 = "9:16"
    LANDSCAPE_16_9 = "16:9"
    ULTRAWIDE = "21:9"


class NanoBananaResolution(str, Enum):
    """Resolution options for Nano Banana Pro."""

    ONE_K = "1K"
    TWO_K = "2K"
    FOUR_K = "4K"


class NanoBananaOutputFormat(str, Enum):
    """Output format options for Nano Banana Pro."""

    PNG = "png"
    JPG = "jpg"


class GrokAspectRatio(str, Enum):
    """Aspect ratio options for Grok Imagine."""

    SQUARE = "1:1"
    PORTRAIT_2_3 = "2:3"
    LANDSCAPE_3_2 = "3:2"


class GrokMode(str, Enum):
    """Generation mode options for Grok Imagine."""

    FUN = "fun"
    NORMAL = "normal"
    SPICY = "spicy"


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


class StoryboardShot(BaseModel):
    """Individual scene in a storyboard."""

    scene: str = Field(..., alias="Scene", description="Scene description/prompt")
    duration: float = Field(
        ..., ge=0, description="Duration in seconds (typically 7.5s per scene)"
    )

    model_config: ClassVar[ConfigDict] = ConfigDict(populate_by_name=True)


class StoryboardInput(BaseModel):
    """Input parameters for Sora 2 Pro Storyboard."""

    n_frames: FrameDuration = Field(
        ..., alias="n_frames", description="Total video length"
    )
    shots: list[StoryboardShot] = Field(
        ..., description="Array of scene objects defining the storyboard sequence"
    )
    image_urls: list[str] | None = Field(
        None, alias="image_urls", description="Reference images for visual consistency"
    )
    aspect_ratio: StoryboardAspectRatio | None = Field(
        None, alias="aspect_ratio", description="Video aspect ratio"
    )

    model_config: ClassVar[ConfigDict] = ConfigDict(populate_by_name=True)


class ByteDanceInput(BaseModel):
    """Input parameters for ByteDance V1 Pro Fast Image-to-Video."""

    prompt: str = Field(
        ..., max_length=10000, description="Text prompt to generate the video"
    )
    image_url: str = Field(
        ..., alias="image_url", description="URL of the image to generate video from"
    )
    resolution: ByteDanceResolution | None = Field(
        None, description="Video resolution (720p or 1080p)"
    )
    duration: ByteDanceDuration | None = Field(
        None, description="Duration of the video in seconds (5s or 10s)"
    )

    model_config: ClassVar[ConfigDict] = ConfigDict(populate_by_name=True)


class NanoBananaInput(BaseModel):
    """Input parameters for Nano Banana Pro image generation."""

    prompt: str = Field(
        ..., max_length=5000, description="Text description of the image to generate"
    )
    image_input: list[str] | None = Field(
        None,
        alias="image_input",
        max_length=8,
        description="Input images to transform or use as reference (up to 8 images)",
    )
    aspect_ratio: NanoBananaAspectRatio | None = Field(
        None, alias="aspect_ratio", description="Aspect ratio of the generated image"
    )
    resolution: NanoBananaResolution | None = Field(
        None, description="Resolution of the generated image (1K, 2K, 4K)"
    )
    output_format: NanoBananaOutputFormat | None = Field(
        None, alias="output_format", description="Format of the output image"
    )

    model_config: ClassVar[ConfigDict] = ConfigDict(populate_by_name=True)


class GrokImageToVideoInput(BaseModel):
    """Input parameters for Grok Imagine Image-to-Video."""

    image_urls: list[str] | None = Field(
        None,
        alias="image_urls",
        max_length=1,
        description="One external image URL for video generation (only one supported)",
    )
    task_id: str | None = Field(
        None,
        alias="task_id",
        max_length=100,
        description="Task ID of a Grok-generated image (supports Spicy mode)",
    )
    index: int | None = Field(
        None,
        ge=0,
        le=5,
        description="Image index (0-5) when using task_id (Grok generates 6 images)",
    )
    prompt: str | None = Field(
        None,
        max_length=5000,
        description="Text prompt describing the desired video motion",
    )
    mode: GrokMode | None = Field(
        None, description="Generation mode (fun, normal, spicy)"
    )

    @field_validator("image_urls")
    @classmethod
    def validate_image_urls(cls, v: list[str] | None) -> list[str] | None:
        if v is not None and len(v) > 1:
            raise ValueError("Only one image URL is supported")
        return v

    model_config: ClassVar[ConfigDict] = ConfigDict(populate_by_name=True)


class GrokTextToVideoInput(BaseModel):
    """Input parameters for Grok Imagine Text-to-Video."""

    prompt: str = Field(
        ..., max_length=5000, description="Text prompt describing the desired video"
    )
    aspect_ratio: GrokAspectRatio | None = Field(
        None, alias="aspect_ratio", description="Aspect ratio of the generated video"
    )
    mode: GrokMode | None = Field(
        None, description="Generation mode (fun, normal, spicy)"
    )

    model_config: ClassVar[ConfigDict] = ConfigDict(populate_by_name=True)


class GrokTextToImageInput(BaseModel):
    """Input parameters for Grok Imagine Text-to-Image."""

    prompt: str = Field(
        ..., max_length=5000, description="Text prompt describing the desired image"
    )
    aspect_ratio: GrokAspectRatio | None = Field(
        None, alias="aspect_ratio", description="Aspect ratio of the generated image"
    )

    model_config: ClassVar[ConfigDict] = ConfigDict(populate_by_name=True)


class GrokUpscaleInput(BaseModel):
    """Input parameters for Grok Imagine Upscale."""

    task_id: str = Field(
        ...,
        alias="task_id",
        max_length=100,
        description="Task ID of a Kie AI-generated video to upscale (360p to 720p)",
    )

    model_config: ClassVar[ConfigDict] = ConfigDict(populate_by_name=True)


class CreateTaskRequest(BaseModel):
    """Request model for creating a job task."""

    model: str = Field(..., description="Model name to use for generation")
    call_back_url: str | None = Field(
        None,
        alias="callBackUrl",
        description="Callback URL for task completion notifications",
    )
    input: (
        StoryboardInput
        | ByteDanceInput
        | NanoBananaInput
        | GrokImageToVideoInput
        | GrokTextToVideoInput
        | GrokTextToImageInput
        | GrokUpscaleInput
        | dict[str, Any]
    ) = Field(..., description="Input parameters for the model")

    model_config: ClassVar[ConfigDict] = ConfigDict(populate_by_name=True)


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
    origin_urls: list[str] | None = Field(
        None,
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
    complete_time: Timestamp | None = Field(
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
    error_message: str | None = Field(
        None, alias="errorMessage", description="Error message if failed"
    )
    create_time: Timestamp | None = Field(
        None, alias="createTime", description="Creation timestamp"
    )
    fallback_flag: bool = Field(
        False, alias="fallbackFlag", description="Whether fallback model was used"
    )

    @field_validator("create_time", "complete_time", mode="before")
    @classmethod
    def _normalize_timestamps(cls, value: TimestampInput) -> Timestamp | None:
        return coerce_timestamp(value)


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
    uploaded_at: Timestamp = Field(
        ..., alias="uploadedAt", description="Upload timestamp"
    )

    @field_validator("uploaded_at", mode="before")
    @classmethod
    def _normalize_uploaded_at(cls, value: TimestampInput) -> Timestamp | None:
        return coerce_timestamp(value)


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


class TaskResultData(BaseModel):
    """Task result data."""

    task_id: str = Field(..., alias="taskId", description="Task ID")
    model: str = Field(..., description="Model used for generation")
    state: TaskState = Field(..., description="Task state")
    param: str = Field(..., description="Complete request parameters as JSON string")
    result_json: str | None = Field(
        None, alias="resultJson", description="Result JSON with generated media URLs"
    )
    fail_code: str | None = Field(None, alias="failCode", description="Error code")
    fail_msg: str | None = Field(None, alias="failMsg", description="Error message")
    complete_time: Timestamp | None = Field(
        None, alias="completeTime", description="Completion timestamp"
    )
    create_time: Timestamp | None = Field(
        None, alias="createTime", description="Creation timestamp"
    )
    update_time: Timestamp | None = Field(
        None, alias="updateTime", description="Update timestamp"
    )

    @field_validator("complete_time", "create_time", "update_time", mode="before")
    @classmethod
    def _normalize_task_timestamps(cls, value: TimestampInput) -> Timestamp | None:
        return coerce_timestamp(value)

    consume_credits: int | None = Field(
        None, alias="consumeCredits", description="Credits consumed"
    )
    cost_time: int | None = Field(
        None, alias="costTime", description="Time cost in seconds"
    )
    remained_credits: int | None = Field(
        None, alias="remainedCredits", description="Remaining credits"
    )

    model_config: ClassVar[ConfigDict] = ConfigDict(populate_by_name=True)


class CreateTaskData(BaseModel):
    """Create task response data."""

    task_id: str = Field(..., alias="taskId", description="Task ID")

    model_config: ClassVar[ConfigDict] = ConfigDict(populate_by_name=True)


class CreateTaskResponse(ApiResponse):
    """Response from create task API."""

    data: CreateTaskData


class TaskDetailsResponse(ApiResponse):
    """Response from task query API."""

    data: TaskResultData
