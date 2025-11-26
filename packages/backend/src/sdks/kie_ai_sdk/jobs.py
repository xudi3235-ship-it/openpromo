"""Job operations for Sora 2 Pro Storyboard and other job-based APIs."""

from collections.abc import Sequence

from .models import (
    ByteDanceDuration,
    ByteDanceInput,
    ByteDanceResolution,
    CreateTaskRequest,
    CreateTaskResponse,
    FrameDuration,
    GrokAspectRatio,
    GrokImageToVideoInput,
    GrokMode,
    GrokTextToImageInput,
    GrokTextToVideoInput,
    GrokUpscaleInput,
    IdeogramCharacterEditInput,
    IdeogramCharacterRemixInput,
    IdeogramCharacterInput,
    IdeogramImageSize,
    IdeogramNumImages,
    IdeogramRenderingSpeed,
    IdeogramStyle,
    NanoBananaAspectRatio,
    NanoBananaInput,
    NanoBananaOutputFormat,
    NanoBananaResolution,
    SoraWatermarkRemoverInput,
    StoryboardAspectRatio,
    StoryboardInput,
    StoryboardShot,
    TaskDetailsResponse,
)
from .protocols import ClientProtocol
from .result_helpers import TaskResultPayload, parse_task_result_payload


class JobsOperations:
    """Job-based API operations (e.g., Sora 2 Pro Storyboard)."""

    def __init__(self, client: ClientProtocol) -> None:
        self.client: ClientProtocol = client

    def create_storyboard_task(
        self,
        shots: Sequence[StoryboardShot | dict[str, str | float]],
        n_frames: FrameDuration,
        aspect_ratio: StoryboardAspectRatio | None = None,
        image_urls: list[str] | None = None,
        callback_url: str | None = None,
    ) -> CreateTaskResponse:
        """
        Create a Sora 2 Pro Storyboard video generation task.

        Args:
            shots: List of scene dictionaries with 'Scene' (description) and 'duration' (seconds)
            n_frames: Total video length (10s, 15s, or 25s)
            aspect_ratio: Video aspect ratio (portrait or landscape)
            image_urls: Optional reference images for visual consistency
            callback_url: Optional callback URL for task completion notifications

        Returns:
            CreateTaskResponse with task_id for tracking

        Note:
            - Videos up to 25 seconds long
            - Each shot typically 7.5 seconds
            - Reference images help maintain consistent visual style
            - Callback URL receives POST requests on task completion

        Pricing:
            - 10s video: 150 credits ($0.75)
            - 15-25s video: 270 credits ($1.35)

        Example:
            >>> shots = [
            ...     {
            ...         "Scene": "A cat wearing headphones at a table with cake",
            ...         "duration": 7.5
            ...     },
            ...     {
            ...         "Scene": "The same cat licking its lips after eating",
            ...         "duration": 7.5
            ...     }
            ... ]
            >>> result = client.jobs.create_storyboard_task(
            ...     shots=shots,
            ...     n_frames=FrameDuration.FIFTEEN_SECONDS,
            ...     aspect_ratio=StoryboardAspectRatio.LANDSCAPE
            ... )
            >>> task_id = result.data.task_id
        """
        # Convert shots to StoryboardShot objects
        shot_objects: list[StoryboardShot] = []
        for shot in shots:
            if isinstance(shot, StoryboardShot):
                shot_objects.append(shot)
                continue

            # shot is expected to be a dict like {"Scene": str, "duration": float}
            scene_val = shot.get("Scene") or shot.get("scene")
            duration_val = shot.get("duration")

            if scene_val is None or duration_val is None:
                raise ValueError("Each storyboard shot requires 'Scene' and 'duration'")

            # ensure correct types before constructing
            scene_str = str(scene_val)
            duration_float = float(duration_val)

            shot_objects.append(
                StoryboardShot(Scene=scene_str, duration=duration_float)
            )

        # Create input object
        storyboard_input = StoryboardInput(
            n_frames=n_frames,
            shots=shot_objects,
            image_urls=image_urls,
            aspect_ratio=aspect_ratio,
        )

        # Create task request
        request = CreateTaskRequest(
            model="sora-2-pro-storyboard",
            callBackUrl=callback_url,
            input=storyboard_input.model_dump(by_alias=True, exclude_none=True),
        )

        response = self.client.session.post(
            f"{self.client.base_url}/api/v1/jobs/createTask",
            json=request.model_dump(by_alias=True, exclude_none=True),
        )

        return self.client._handle_response(response, CreateTaskResponse)  # pyright: ignore[reportPrivateUsage]

    def get_task_details(self, task_id: str) -> TaskDetailsResponse:
        """
        Query task status and results by task ID.

        Args:
            task_id: Task ID from create_storyboard_task

        Returns:
            TaskDetailsResponse with task details including:
                - state: Task state (waiting, queuing, generating, success, fail)
                - result_json: JSON string with resultUrls on success
                - fail_code/fail_msg: Error details on failure
                - complete_time: Completion timestamp
                - consume_credits: Credits used
                - remained_credits: Remaining account credits

        Example:
            >>> details = client.jobs.get_task_details("task_12345678")
            >>> if details.data.state == TaskState.SUCCESS:
            ...     import json
            ...     result = json.loads(details.data.result_json)
            ...     video_url = result["resultUrls"][0]
        """
        response = self.client.session.get(
            f"{self.client.base_url}/api/v1/jobs/recordInfo",
            params={"taskId": task_id},
        )

        return self.client._handle_response(response, TaskDetailsResponse)  # pyright: ignore[reportPrivateUsage]

    def create_bytedance_task(
        self,
        prompt: str,
        image_url: str,
        resolution: ByteDanceResolution | None = None,
        duration: ByteDanceDuration | None = None,
        callback_url: str | None = None,
    ) -> CreateTaskResponse:
        """
        Create a ByteDance V1 Pro Fast Image-to-Video generation task.

        Args:
            prompt: Text prompt to guide video generation (max 10000 characters)
            image_url: URL of the image to use as input for video generation
            resolution: Video resolution (720p for balance, 1080p for higher quality)
            duration: Duration of the video (5s or 10s)
            callback_url: Optional callback URL for task completion notifications

        Returns:
            CreateTaskResponse with task_id for tracking

        Note:
            - Generates video from a single input image
            - Supports up to 10 seconds duration
            - 720p for faster generation, 1080p for higher quality
            - Callback URL receives POST requests on task completion

        Example:
            >>> result = client.jobs.create_bytedance_task(
            ...     prompt="A cinematic close-up of espresso being poured into a cup",
            ...     image_url="https://example.com/coffee-cup.jpg",
            ...     resolution=ByteDanceResolution.R_720P,
            ...     duration=ByteDanceDuration.FIVE_SECONDS
            ... )
            >>> task_id = result.data.task_id
        """
        # Create input object
        bytedance_input = ByteDanceInput(
            prompt=prompt,
            image_url=image_url,
            resolution=resolution,
            duration=duration,
        )

        # Create task request
        request = CreateTaskRequest(
            model="bytedance/v1-pro-fast-image-to-video",
            callBackUrl=callback_url,
            input=bytedance_input.model_dump(by_alias=True, exclude_none=True),
        )

        response = self.client.session.post(
            f"{self.client.base_url}/api/v1/jobs/createTask",
            json=request.model_dump(by_alias=True, exclude_none=True),
        )

        return self.client._handle_response(response, CreateTaskResponse)  # pyright: ignore[reportPrivateUsage]

    def create_nanobanana_task(
        self,
        prompt: str,
        image_input: list[str] | None = None,
        aspect_ratio: NanoBananaAspectRatio | None = None,
        resolution: NanoBananaResolution | None = None,
        output_format: NanoBananaOutputFormat | None = None,
        callback_url: str | None = None,
    ) -> CreateTaskResponse:
        """
        Create a Nano Banana Pro image generation task.

        Args:
            prompt: Text description of the image to generate (max 5000 characters)
            image_input: Optional list of input image URLs to transform or use as reference (up to 8 images)
            aspect_ratio: Aspect ratio of the generated image
            resolution: Resolution (1K, 2K, or 4K). 2K for sharper imagery, 4K for intelligent scaling
            output_format: Output format (PNG or JPG)
            callback_url: Optional callback URL for task completion notifications

        Returns:
            CreateTaskResponse with task_id for tracking

        Note:
            - Powered by Google DeepMind's Nano Banana Pro
            - Delivers sharper 2K imagery and intelligent 4K scaling
            - Improved text rendering and character consistency
            - Pricing: 24 credits per image (≈ $0.12)
            - Supports up to 8 reference images for transformation

        Example:
            >>> result = client.jobs.create_nanobanana_task(
            ...     prompt="Comic poster: cool banana hero in shades",
            ...     aspect_ratio=NanoBananaAspectRatio.SQUARE,
            ...     resolution=NanoBananaResolution.TWO_K,
            ...     output_format=NanoBananaOutputFormat.PNG
            ... )
            >>> task_id = result.data.task_id
        """
        # Create input object
        nanobanana_input = NanoBananaInput(
            prompt=prompt,
            image_input=image_input,
            aspect_ratio=aspect_ratio,
            resolution=resolution,
            output_format=output_format,
        )

        # Create task request
        request = CreateTaskRequest(
            model="nano-banana-pro",
            callBackUrl=callback_url,
            input=nanobanana_input.model_dump(by_alias=True, exclude_none=True),
        )

        response = self.client.session.post(
            f"{self.client.base_url}/api/v1/jobs/createTask",
            json=request.model_dump(by_alias=True, exclude_none=True),
        )

        return self.client._handle_response(response, CreateTaskResponse)  # pyright: ignore[reportPrivateUsage]

    def get_task_result_payload(
        self, task_details: TaskDetailsResponse
    ) -> TaskResultPayload | None:
        """Parse the task details' result_json into a payload helper."""

        return parse_task_result_payload(task_details.data.result_json)

    def extract_image_urls(self, task_details: TaskDetailsResponse) -> list[str]:
        """
        Extract image URLs from Nano Banana Pro task results.

        Args:
            task_details: TaskDetailsResponse from get_task_details()

        Returns:
            List of generated image URLs

        Raises:
            ValueError: If task is not successful or result_json is invalid

        Example:
            >>> details = client.jobs.get_task_details("task_12345678")
            >>> image_urls = client.jobs.extract_image_urls(details)
            >>> print(image_urls[0])
            https://example.com/generated-image.jpg
        """

        if task_details.data.state != "success":
            raise ValueError(
                f"Task is not successful. Current state: {task_details.data.state}"
            )

        payload = self.get_task_result_payload(task_details)
        if not payload:
            raise ValueError("No result_json found in task details")
        return payload.result_urls

    def extract_video_url(self, task_details: TaskDetailsResponse) -> str:
        """
        Extract video URL from Sora 2 Pro Storyboard or ByteDance task results.

        Args:
            task_details: TaskDetailsResponse from get_task_details()

        Returns:
            Generated video URL

        Raises:
            ValueError: If task is not successful, result_json is invalid, or no video URL found

        Example:
            >>> details = client.jobs.get_task_details("task_12345678")
            >>> video_url = client.jobs.extract_video_url(details)
            >>> print(video_url)
            https://example.com/generated-video.mp4
        """

        if task_details.data.state != "success":
            raise ValueError(
                f"Task is not successful. Current state: {task_details.data.state}"
            )

        payload = self.get_task_result_payload(task_details)
        if not payload:
            raise ValueError("No result_json found in task details")
        if not payload.result_urls:
            raise ValueError("No resultUrls found in result_json")
        return payload.result_urls[0]

    def create_grok_image_to_video_task(
        self,
        prompt: str | None = None,
        image_urls: list[str] | None = None,
        task_id: str | None = None,
        index: int | None = None,
        mode: GrokMode | None = None,
        callback_url: str | None = None,
    ) -> CreateTaskResponse:
        """
        Create a Grok Imagine Image-to-Video generation task.

        Args:
            prompt: Text prompt describing the desired video motion (max 5000 characters)
            image_urls: One external image URL for video generation (only one supported)
            task_id: Task ID of a Grok-generated image (supports Spicy mode)
            index: Image index (0-5) when using task_id (Grok generates 6 images)
            mode: Generation mode (fun, normal, spicy). Note: Spicy mode only works with task_id
            callback_url: Optional callback URL for task completion notifications

        Returns:
            CreateTaskResponse with task_id for tracking

        Note:
            - Powered by xAI's Grok Imagine multimodal model
            - Generates ~6 second videos with coherent motion
            - Pricing: 20 credits per video (~$0.10)
            - External images do not support Spicy mode (auto-switches to Normal)
            - Use either image_urls OR task_id+index, not both

        Example:
            >>> # Using external image
            >>> result = client.jobs.create_grok_image_to_video_task(
            ...     prompt="POV hand comes into frame handing the girl a cup of coffee",
            ...     image_urls=["https://example.com/image.png"],
            ...     mode=GrokMode.NORMAL
            ... )
            >>> task_id = result.data.task_id
        """
        # Create input object
        grok_input = GrokImageToVideoInput(
            image_urls=image_urls,
            task_id=task_id,
            index=index,
            prompt=prompt,
            mode=mode,
        )

        # Create task request
        request = CreateTaskRequest(
            model="grok-imagine/image-to-video",
            callBackUrl=callback_url,
            input=grok_input.model_dump(by_alias=True, exclude_none=True),
        )

        response = self.client.session.post(
            f"{self.client.base_url}/api/v1/jobs/createTask",
            json=request.model_dump(by_alias=True, exclude_none=True),
        )

        return self.client._handle_response(response, CreateTaskResponse)  # pyright: ignore[reportPrivateUsage]

    def create_grok_text_to_video_task(
        self,
        prompt: str,
        aspect_ratio: GrokAspectRatio | None = None,
        mode: GrokMode | None = None,
        callback_url: str | None = None,
    ) -> CreateTaskResponse:
        """
        Create a Grok Imagine Text-to-Video generation task.

        Args:
            prompt: Text prompt describing the desired video (max 5000 characters)
            aspect_ratio: Aspect ratio of the generated video (1:1, 2:3, 3:2)
            mode: Generation mode (fun, normal, spicy)
            callback_url: Optional callback URL for task completion notifications

        Returns:
            CreateTaskResponse with task_id for tracking

        Note:
            - Powered by xAI's Grok Imagine multimodal model
            - Generates ~6 second videos with coherent motion
            - Pricing: 20 credits per video (~$0.10)
            - Supports fun, normal, and spicy generation modes

        Example:
            >>> result = client.jobs.create_grok_text_to_video_task(
            ...     prompt="A couple of doors open to show different rooms inside",
            ...     aspect_ratio=GrokAspectRatio.PORTRAIT_2_3,
            ...     mode=GrokMode.NORMAL
            ... )
            >>> task_id = result.data.task_id
        """
        # Create input object
        grok_input = GrokTextToVideoInput(
            prompt=prompt,
            aspect_ratio=aspect_ratio,
            mode=mode,
        )

        # Create task request
        request = CreateTaskRequest(
            model="grok-imagine/text-to-video",
            callBackUrl=callback_url,
            input=grok_input.model_dump(by_alias=True, exclude_none=True),
        )

        response = self.client.session.post(
            f"{self.client.base_url}/api/v1/jobs/createTask",
            json=request.model_dump(by_alias=True, exclude_none=True),
        )

        return self.client._handle_response(response, CreateTaskResponse)  # pyright: ignore[reportPrivateUsage]

    def create_grok_text_to_image_task(
        self,
        prompt: str,
        aspect_ratio: GrokAspectRatio | None = None,
        callback_url: str | None = None,
    ) -> CreateTaskResponse:
        """
        Create a Grok Imagine Text-to-Image generation task.

        Args:
            prompt: Text prompt describing the desired image (max 5000 characters)
            aspect_ratio: Aspect ratio of the generated image (1:1, 2:3, 3:2)
            callback_url: Optional callback URL for task completion notifications

        Returns:
            CreateTaskResponse with task_id for tracking

        Note:
            - Powered by xAI's Grok Imagine multimodal model
            - Generates 6 images per task
            - Pricing: 4 credits per generation (~$0.02) for 6 images
            - Use extract_image_urls() to get all 6 generated image URLs

        Example:
            >>> result = client.jobs.create_grok_text_to_image_task(
            ...     prompt="Cinematic portrait of a woman by a vinyl record player",
            ...     aspect_ratio=GrokAspectRatio.LANDSCAPE_3_2
            ... )
            >>> task_id = result.data.task_id
        """
        # Create input object
        grok_input = GrokTextToImageInput(prompt=prompt, aspect_ratio=aspect_ratio)

        # Create task request
        request = CreateTaskRequest(
            model="grok-imagine/text-to-image",
            callBackUrl=callback_url,
            input=grok_input.model_dump(by_alias=True, exclude_none=True),
        )

        response = self.client.session.post(
            f"{self.client.base_url}/api/v1/jobs/createTask",
            json=request.model_dump(by_alias=True, exclude_none=True),
        )

        return self.client._handle_response(response, CreateTaskResponse)  # pyright: ignore[reportPrivateUsage]

    def create_grok_upscale_task(
        self,
        task_id: str,
        callback_url: str | None = None,
    ) -> CreateTaskResponse:
        """
        Create a Grok Imagine Upscale task (360p to 720p).

        Args:
            task_id: Task ID of a Kie AI-generated video to upscale
            callback_url: Optional callback URL for task completion notifications

        Returns:
            CreateTaskResponse with task_id for tracking

        Note:
            - Natively enhances Grok Imagine videos from 360p to 720p
            - Only supports Kie AI-generated task IDs
            - Pricing: 10 credits per upscale (~$0.05)
            - Works only with videos generated via Kie AI platform

        Example:
            >>> result = client.jobs.create_grok_upscale_task(
            ...     task_id="task_12345678"
            ... )
            >>> upscale_task_id = result.data.task_id
        """
        # Create input object
        grok_input = GrokUpscaleInput(task_id=task_id)

        # Create task request
        request = CreateTaskRequest(
            model="grok-imagine/upscale",
            callBackUrl=callback_url,
            input=grok_input.model_dump(by_alias=True, exclude_none=True),
        )

        response = self.client.session.post(
            f"{self.client.base_url}/api/v1/jobs/createTask",
            json=request.model_dump(by_alias=True, exclude_none=True),
        )

        return self.client._handle_response(response, CreateTaskResponse)  # pyright: ignore[reportPrivateUsage]

    def create_sora_watermark_remover_task(
        self,
        video_url: str,
        callback_url: str | None = None,
    ) -> CreateTaskResponse:
        """
        Create a Sora 2 Watermark Remover task.

        Args:
            video_url: Sora 2 video URL (must be publicly accessible,
                       starting with sora.chatgpt.com, max 500 characters)
            callback_url: Optional callback URL for task completion notifications

        Returns:
            CreateTaskResponse with task_id for tracking

        Note:
            - Uses AI detection and motion tracking to remove dynamic watermarks
            - Keeps frames smooth and natural
            - Processing time typically 1-3 seconds
            - Pricing: 10 credits per use (~$0.05)
            - Video URL must be publicly accessible from OpenAI

        Example:
            >>> result = client.jobs.create_sora_watermark_remover_task(
            ...     video_url="https://sora.chatgpt.com/p/s_68e83bd7eee88191be79d2ba7158516f"
            ... )
            >>> task_id = result.data.task_id
        """
        # Create input object
        watermark_input = SoraWatermarkRemoverInput(video_url=video_url)

        # Create task request
        request = CreateTaskRequest(
            model="sora-watermark-remover",
            callBackUrl=callback_url,
            input=watermark_input.model_dump(by_alias=True, exclude_none=True),
        )

        response = self.client.session.post(
            f"{self.client.base_url}/api/v1/jobs/createTask",
            json=request.model_dump(by_alias=True, exclude_none=True),
        )

        return self.client._handle_response(response, CreateTaskResponse)  # pyright: ignore[reportPrivateUsage]

    def create_ideogram_character_edit_task(
        self,
        prompt: str,
        image_url: str,
        mask_url: str,
        reference_image_urls: list[str],
        rendering_speed: IdeogramRenderingSpeed | None = None,
        style: IdeogramStyle | None = None,
        expand_prompt: bool | None = None,
        num_images: IdeogramNumImages | None = None,
        seed: int | None = None,
        callback_url: str | None = None,
    ) -> CreateTaskResponse:
        """
        Create an Ideogram Character Edit task.

        Args:
            prompt: The prompt to fill the masked part of the image (max 5000 characters)
            image_url: The image URL to generate an image from. Needs to match the dimensions of the mask
            mask_url: The mask URL to inpaint the image. Needs to match the dimensions of the input image
            reference_image_urls: A set of images to use as character references (currently only 1 image is supported)
            rendering_speed: The rendering speed to use (TURBO, BALANCED, QUALITY)
            style: The style type to generate with (AUTO, REALISTIC, FICTION)
            expand_prompt: Determine if MagicPrompt should be used in generating the request or not
            num_images: Number of images to generate (1, 2, 3, 4)
            seed: Seed for the random number generator
            callback_url: Optional callback URL for task completion notifications

        Returns:
            CreateTaskResponse with task_id for tracking

        Note:
            - Uses Ideogram's Character Edit model for inpainting with character consistency
            - Reference images help maintain consistent character appearance
            - Mask defines which areas to inpaint
            - Pricing: Varies by rendering speed and image count

        Example:
            >>> result = client.jobs.create_ideogram_character_edit_task(
            ...     prompt="A fabulous look head tilted down, looking forward with a smile",
            ...     image_url="https://example.com/input.jpg",
            ...     mask_url="https://example.com/mask.jpg",
            ...     reference_image_urls=["https://example.com/character.jpg"],
            ...     rendering_speed=IdeogramRenderingSpeed.BALANCED,
            ...     num_images=IdeogramNumImages.ONE
            ... )
            >>> task_id = result.data.task_id
        """
        # Create input object
        ideogram_input = IdeogramCharacterEditInput(
            prompt=prompt,
            image_url=image_url,
            mask_url=mask_url,
            reference_image_urls=reference_image_urls,
            rendering_speed=rendering_speed,
            style=style,
            expand_prompt=expand_prompt,
            num_images=num_images,
            seed=seed,
        )

        # Create task request
        request = CreateTaskRequest(
            model="ideogram/character-edit",
            callBackUrl=callback_url,
            input=ideogram_input.model_dump(by_alias=True, exclude_none=True),
        )

        response = self.client.session.post(
            f"{self.client.base_url}/api/v1/jobs/createTask",
            json=request.model_dump(by_alias=True, exclude_none=True),
        )

        return self.client._handle_response(response, CreateTaskResponse)  # pyright: ignore[reportPrivateUsage]

    def create_ideogram_character_remix_task(
        self,
        prompt: str,
        image_url: str,
        reference_image_urls: list[str],
        rendering_speed: IdeogramRenderingSpeed | None = None,
        style: IdeogramStyle | None = None,
        expand_prompt: bool | None = None,
        image_size: IdeogramImageSize | None = None,
        num_images: IdeogramNumImages | None = None,
        seed: int | None = None,
        strength: float | None = None,
        negative_prompt: str | None = None,
        image_urls: list[str] | None = None,
        reference_mask_urls: str | None = None,
        callback_url: str | None = None,
    ) -> CreateTaskResponse:
        """
        Create an Ideogram Character Remix task.

        Args:
            prompt: The prompt to remix the image with (max 5000 characters)
            image_url: The image URL to remix
            reference_image_urls: A set of images to use as character references (currently only 1 image is supported)
            rendering_speed: The rendering speed to use (TURBO, BALANCED, QUALITY)
            style: The style type to generate with (AUTO, REALISTIC, FICTION)
            expand_prompt: Determine if MagicPrompt should be used in generating the request or not
            image_size: The resolution of the generated image
            num_images: Number of images to generate (1, 2, 3, 4)
            seed: Seed for the random number generator
            strength: Strength of the input image in the remix (0.1 - 1.0)
            negative_prompt: Description of what to exclude from an image (max 500 characters)
            image_urls: A set of images to use as style references
            reference_mask_urls: A set of masks to apply to the character references
            callback_url: Optional callback URL for task completion notifications

        Returns:
            CreateTaskResponse with task_id for tracking

        Note:
            - Uses Ideogram's Character Remix model for transforming images while maintaining character consistency
            - Strength parameter controls how much of the original image to preserve
            - Style references can influence the visual aesthetic
            - Pricing: Varies by rendering speed and image count

        Example:
            >>> result = client.jobs.create_ideogram_character_remix_task(
            ...     prompt="A fisheye lens selfie photograph taken at night on an urban street",
            ...     image_url="https://example.com/input.jpg",
            ...     reference_image_urls=["https://example.com/character.jpg"],
            ...     rendering_speed=IdeogramRenderingSpeed.BALANCED,
            ...     strength=0.8,
            ...     num_images=IdeogramNumImages.ONE
            ... )
            >>> task_id = result.data.task_id
        """
        # Create input object
        ideogram_input = IdeogramCharacterRemixInput(
            prompt=prompt,
            image_url=image_url,
            reference_image_urls=reference_image_urls,
            rendering_speed=rendering_speed,
            style=style,
            expand_prompt=expand_prompt,
            image_size=image_size,
            num_images=num_images,
            seed=seed,
            strength=strength,
            negative_prompt=negative_prompt,
            image_urls=image_urls or [],
            reference_mask_urls=reference_mask_urls or "",
        )

        # Create task request
        request = CreateTaskRequest(
            model="ideogram/character-remix",
            callBackUrl=callback_url,
            input=ideogram_input.model_dump(by_alias=True, exclude_none=True),
        )

        response = self.client.session.post(
            f"{self.client.base_url}/api/v1/jobs/createTask",
            json=request.model_dump(by_alias=True, exclude_none=True),
        )

        return self.client._handle_response(response, CreateTaskResponse)  # pyright: ignore[reportPrivateUsage]

    def create_ideogram_character_task(
        self,
        prompt: str,
        reference_image_urls: list[str],
        rendering_speed: IdeogramRenderingSpeed | None = None,
        style: IdeogramStyle | None = None,
        expand_prompt: bool | None = None,
        num_images: IdeogramNumImages | None = None,
        image_size: IdeogramImageSize | None = None,
        seed: int | None = None,
        negative_prompt: str | None = None,
        callback_url: str | None = None,
    ) -> CreateTaskResponse:
        """
        Create an Ideogram Character task.

        Args:
            prompt: The prompt to generate the character image (max 5000 characters)
            reference_image_urls: A set of images to use as character references (currently only 1 image is supported)
            rendering_speed: The rendering speed to use (TURBO, BALANCED, QUALITY)
            style: The style type to generate with (AUTO, REALISTIC, FICTION)
            expand_prompt: Determine if MagicPrompt should be used in generating the request or not
            num_images: Number of images to generate (1, 2, 3, 4)
            image_size: The resolution of the generated image
            seed: Seed for the random number generator
            negative_prompt: Description of what to exclude from an image (max 5000 characters)
            callback_url: Optional callback URL for task completion notifications

        Returns:
            CreateTaskResponse with task_id for tracking

        Note:
            - Uses Ideogram's Character model for generating character-consistent images
            - Reference images help maintain consistent character appearance across generations
            - Supports various aspect ratios and rendering speeds
            - Pricing: Varies by rendering speed and image count

        Example:
            >>> result = client.jobs.create_ideogram_character_task(
            ...     prompt="Place the woman from the uploaded portrait, wearing a casual white blouse, in a peaceful garden setting",
            ...     reference_image_urls=["https://example.com/character.jpg"],
            ...     rendering_speed=IdeogramRenderingSpeed.BALANCED,
            ...     image_size=IdeogramImageSize.SQUARE_HD,
            ...     num_images=IdeogramNumImages.ONE
            ... )
            >>> task_id = result.data.task_id
        """
        # Create input object
        ideogram_input = IdeogramCharacterInput(
            prompt=prompt,
            reference_image_urls=reference_image_urls,
            rendering_speed=rendering_speed,
            style=style,
            expand_prompt=expand_prompt,
            num_images=num_images,
            image_size=image_size,
            seed=seed,
            negative_prompt=negative_prompt,
        )

        # Create task request
        request = CreateTaskRequest(
            model="ideogram/character",
            callBackUrl=callback_url,
            input=ideogram_input.model_dump(by_alias=True, exclude_none=True),
        )

        response = self.client.session.post(
            f"{self.client.base_url}/api/v1/jobs/createTask",
            json=request.model_dump(by_alias=True, exclude_none=True),
        )

        return self.client._handle_response(response, CreateTaskResponse)  # pyright: ignore[reportPrivateUsage]
