"""Kie AI Sora 2 Pro Storyboard provider implementation."""

import asyncio
import json

from src.core.shared import get_env_or_raise
from src.sdks.kie_ai_sdk import KieAIClient
from src.sdks.kie_ai_sdk.models import (
    FrameDuration,
    TaskState,
)
from src.sdks.kie_ai_sdk.models import (
    StoryboardAspectRatio as KieStoryboardAspectRatio,
)
from src.sdks.kie_ai_sdk.models import (
    StoryboardShot as KieStoryboardShot,
)

from .models import (
    StoryboardAspectRatio,
    StoryboardConfig,
    StoryboardDuration,
    StoryboardResult,
    StoryboardShot,
)


def map_duration_to_kie(duration: StoryboardDuration) -> FrameDuration:
    """Map unified duration to Kie AI FrameDuration."""
    mapping: dict[str, FrameDuration] = {
        "10": FrameDuration.TEN_SECONDS,
        "15": FrameDuration.FIFTEEN_SECONDS,
        "25": FrameDuration.TWENTY_FIVE_SECONDS,
    }
    return mapping.get(duration.value, FrameDuration.FIFTEEN_SECONDS)


def map_aspect_ratio_to_kie(
    aspect_ratio: StoryboardAspectRatio,
) -> KieStoryboardAspectRatio:
    """Map unified aspect ratio to Kie AI StoryboardAspectRatio."""
    mapping: dict[str, KieStoryboardAspectRatio] = {
        "portrait": KieStoryboardAspectRatio.PORTRAIT,
        "landscape": KieStoryboardAspectRatio.LANDSCAPE,
    }
    return mapping.get(aspect_ratio.value, KieStoryboardAspectRatio.LANDSCAPE)


def upload_images_to_kie_ai(client: KieAIClient, image_paths: list[str]) -> list[str]:
    """Upload local image files to Kie AI and return their URLs."""
    uploaded_urls: list[str] = []
    for path in image_paths:
        print(f"Uploading reference image to Kie AI: {path}")
        response = client.upload.upload_file_stream(
            file_path=path,
            upload_path="sora2_storyboard/images",
        )
        if not response.data:
            raise ValueError(f"Failed to upload image: {path}")
        uploaded_urls.append(response.data.download_url)
        print(f"Uploaded: {path} -> {response.data.download_url}")
    return uploaded_urls


async def poll_kie_ai_task(client: KieAIClient, task_id: str) -> str:
    """Poll Kie AI task until complete and return video URL."""
    max_attempts = 180  # 30 minutes max for storyboard (longer videos)
    for _ in range(max_attempts):
        details = client.jobs.get_task_details(task_id)
        if not details.data:
            raise ValueError("No details returned from Kie AI")

        state = details.data.state
        if state == TaskState.SUCCESS:
            # Parse result_json to get video URL
            if details.data.result_json:
                result: dict[str, list[str]] = json.loads(details.data.result_json)
                urls = result.get("resultUrls", [])
                if urls:
                    return urls[0]
            raise ValueError("No video URL in successful response")
        elif state == TaskState.FAIL:
            error_msg = details.data.fail_msg or "Unknown error"
            raise ValueError(f"Video generation failed: {error_msg}")

        print("Waiting for Sora 2 Pro Storyboard generation to complete...")
        await asyncio.sleep(10)

    raise ValueError("Timeout waiting for video generation")


async def download_video(video_url: str, output_path: str) -> None:
    """Download video to local path."""
    import httpx

    async with httpx.AsyncClient(timeout=120.0) as http_client:
        response = await http_client.get(video_url, follow_redirects=True)
        response.raise_for_status()
        with open(output_path, "wb") as f:
            f.write(response.content)
    print(f"Generated video saved to {output_path}")


async def generate_storyboard_video(
    shots: list[StoryboardShot],
    output_path: str,
    config: StoryboardConfig,
    reference_image_paths: list[str] | None = None,
) -> StoryboardResult:
    """Generate storyboard video using Kie AI SDK.

    Args:
        shots: List of StoryboardShot objects defining scenes.
        output_path: Path where the generated video will be saved.
        config: Configuration for video generation.
        reference_image_paths: Optional list of local image paths for visual consistency.

    Returns:
        StoryboardResult with status and video details.
    """
    try:
        client = KieAIClient(api_key=get_env_or_raise("KIE_AI_API_KEY"))

        # Convert shots to Kie AI format
        kie_shots: list[KieStoryboardShot] = [
            KieStoryboardShot(Scene=shot.scene, duration=shot.duration)
            for shot in shots
        ]

        # Upload reference images if provided
        image_urls: list[str] | None = None
        if reference_image_paths:
            image_urls = upload_images_to_kie_ai(client, reference_image_paths)

        print(
            f">>> Creating Sora 2 Pro Storyboard: {len(shots)} shots, {config.n_frames.value}s duration"
        )

        response = client.jobs.create_storyboard_task(
            shots=kie_shots,
            n_frames=map_duration_to_kie(config.n_frames),
            aspect_ratio=map_aspect_ratio_to_kie(config.aspect_ratio),
            image_urls=image_urls,
        )

        if not response.data:
            raise ValueError("No task ID returned from Kie AI")

        task_id = response.data.task_id
        print(f"Storyboard task created: {task_id}")

        video_url = await poll_kie_ai_task(client, task_id)

        # Download the video to output_path
        await download_video(video_url, output_path)

        client.close()
        return StoryboardResult(
            status="success",
            message=f"Storyboard video generated and saved to {output_path}",
            output_path=output_path,
            video_url=video_url,
            task_id=task_id,
        )
    except Exception as e:
        return StoryboardResult(
            status="error",
            message=f"Error in Sora 2 Pro Storyboard generation: {e!s}",
            error_type=type(e).__name__,
        )
