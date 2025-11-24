"""Veo 3.1 video generation operations."""

from .models import (
    AspectRatio,
    ExtendVideoRequest,
    ExtendVideoResponse,
    GenerateVideoRequest,
    GenerateVideoResponse,
    GenerationType,
    Model,
    Video1080pResponse,
    VideoDetailsResponse,
)
from .protocols import ClientProtocol


class VeoOperations:
    """Veo 3.1 video generation operations."""

    def __init__(self, client: ClientProtocol) -> None:
        self.client: ClientProtocol = client

    def generate_video(
        self,
        prompt: str,
        image_urls: list[str] | None = None,
        model: Model = Model.VEO3_FAST,
        generation_type: GenerationType | None = None,
        aspect_ratio: AspectRatio = AspectRatio.LANDSCAPE,
        seeds: int | None = None,
        callback_url: str | None = None,
        enable_translation: bool = True,
        watermark: str | None = None,
    ) -> GenerateVideoResponse:
        """
        Generate a Veo 3.1 AI video.

        Args:
            prompt: Text description of desired video content (detailed and specific)
            image_urls: Optional list of 1-2 image URLs for image-to-video generation
                - 1 image: Video unfolds around this image
                - 2 images: First image as first frame, second as last frame
            model: Model type (veo3 or veo3_fast)
            generation_type: Video generation mode (auto-detected if not specified)
            aspect_ratio: Video aspect ratio (16:9, 9:16, or Auto)
            seeds: Random seed (10000-99999) for reproducible results
            callback_url: URL for completion callbacks
            enable_translation: Auto-translate prompts to English (recommended)
            watermark: Optional watermark text

        Returns:
            GenerateVideoResponse with task_id for tracking

        Example:
            >>> client = KieAIClient("your-api-key")
            >>> result = client.veo.generate_video(
            ...     prompt="A dog playing in a park",
            ...     model=Model.VEO3_FAST,
            ...     aspect_ratio=AspectRatio.LANDSCAPE
            ... )
            >>> task_id = result.data.task_id
        """
        request = GenerateVideoRequest.model_validate(
            {
                "prompt": prompt,
                "imageUrls": image_urls,
                "model": model,
                "generationType": generation_type,
                "aspectRatio": aspect_ratio,
                "seeds": seeds,
                "callBackUrl": callback_url,
                "enableTranslation": enable_translation,
                "watermark": watermark,
            },
            strict=False,
        )

        response = self.client.session.post(
            f"{self.client.base_url}/api/v1/veo/generate",
            json=request.model_dump(by_alias=True, exclude_none=True),
        )

        return self.client._handle_response(response, GenerateVideoResponse)  # pyright: ignore[reportPrivateUsage]

    def extend_video(
        self,
        task_id: str,
        prompt: str,
        seeds: int | None = None,
        watermark: str | None = None,
        callback_url: str | None = None,
    ) -> ExtendVideoResponse:
        """
        Extend an existing Veo 3.1 video.

        Args:
            task_id: Task ID from the original video generation
            prompt: Description of how to extend the video
            seeds: Random seed (10000-99999) for reproducible results
            watermark: Optional watermark text
            callback_url: URL for completion callbacks

        Returns:
            ExtendVideoResponse with task_id for tracking

        Note:
            - Can only extend videos generated through Veo 3.1 API
            - Videos generated after 1080P processing cannot be extended

        Example:
            >>> result = client.veo.extend_video(
            ...     task_id="veo_task_abcdef123456",
            ...     prompt="The dog continues running and jumps over obstacles"
            ... )
            >>> extension_task_id = result.data.task_id
        """
        request = ExtendVideoRequest.model_validate(
            {
                "taskId": task_id,
                "prompt": prompt,
                "seeds": seeds,
                "watermark": watermark,
                "callBackUrl": callback_url,
            },
            strict=False,
        )

        response = self.client.session.post(
            f"{self.client.base_url}/api/v1/veo/extend",
            json=request.model_dump(by_alias=True, exclude_none=True),
        )

        return self.client._handle_response(response, ExtendVideoResponse)  # pyright: ignore[reportPrivateUsage]

    def get_video_details(self, task_id: str) -> VideoDetailsResponse:
        """
        Get video generation task details and status.

        Args:
            task_id: Task ID from video generation

        Returns:
            VideoDetailsResponse with task details including:
                - success_flag: Status (0=generating, 1=success, 2=failed, 3=generation_failed)
                - response.result_urls: List of generated video URLs
                - response.origin_urls: List of original quality video URLs
                - response.resolution: Video resolution
                - fallback_flag: Whether fallback model was used

        Example:
            >>> details = client.veo.get_video_details("veo_task_abcdef123456")
            >>> if details.data.success_flag == TaskStatus.SUCCESS:
            ...     video_url = details.data.response.result_urls[0]
        """
        response = self.client.session.get(
            f"{self.client.base_url}/api/v1/veo/record-info", params={"taskId": task_id}
        )

        return self.client._handle_response(response, VideoDetailsResponse)  # pyright: ignore[reportPrivateUsage]

    def get_1080p_video(
        self, task_id: str, index: int | None = None
    ) -> Video1080pResponse:
        """
        Get the 1080P version of a generated video.

        Args:
            task_id: Task ID from video generation
            index: Video index (optional)

        Returns:
            Video1080pResponse with result_url for the 1080P video

        Note:
            - Only 16:9 aspect ratio videos support 1080P
            - 1080P processing takes ~2 minutes after initial generation
            - Videos from fallback mode are already 1080P
            - Will return error 400 if not ready yet - retry after waiting

        Example:
            >>> result = client.veo.get_1080p_video("veo_task_abcdef123456")
            >>> hd_url = result.data.result_url
        """
        params: dict[str, str | int] = {"taskId": task_id}
        if index is not None:
            params["index"] = index

        response = self.client.session.get(
            f"{self.client.base_url}/api/v1/veo/get-1080p-video", params=params
        )

        return self.client._handle_response(response, Video1080pResponse)  # pyright: ignore[reportPrivateUsage]
