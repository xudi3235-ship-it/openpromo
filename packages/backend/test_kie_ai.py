import logging
import time

import requests

from src.core.shared import get_env_or_raise
from src.sdks.kie_ai_sdk.client import KieAIClient
from src.sdks.kie_ai_sdk.models import (
    AspectRatio,
    FrameDuration,
    IdeogramImageSize,
    IdeogramNumImages,
    IdeogramRenderingSpeed,
    IdeogramStyle,
    Model,
    NanoBananaAspectRatio,
    NanoBananaOutputFormat,
    NanoBananaResolution,
    StoryboardAspectRatio,
    TaskState,
)

# Set up logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


def test_kie_ai_veo31():
    # Initialize client
    api_key = get_env_or_raise("KIE_AI_API_KEY")  # Assuming this env var is set
    client = KieAIClient(api_key)

    # Path to an image in ./tmp
    image_path = "/Users/ruizeli/dev/openpromo/packages/backend/tmp/generated_images/4049de4050.png"

    # Upload the image
    logger.info("Uploading image...")
    upload_result = client.upload.upload_file_stream(
        file_path=image_path, upload_path="images/test", file_name="test_image.png"
    )
    image_url = upload_result.data.download_url
    logger.info(f"Image uploaded: {image_url}")

    # Generate video using the image
    logger.info("Generating video...")
    video_result = client.veo.generate_video(
        prompt="A dynamic scene where the subject comes to life and moves around",
        image_urls=[image_url],
        model=Model.VEO3_FAST,  # Use fast model for testing
        aspect_ratio=AspectRatio.LANDSCAPE,
    )
    task_id = video_result.data.task_id
    logger.info(f"Video generation started, task_id: {task_id}")

    # Poll for completion
    logger.info("Polling for video completion...")
    while True:
        details = client.veo.get_video_details(task_id)
        status = details.data.success_flag
        logger.info(f"Status: {status}")
        if status == 1:  # Success
            video_urls = details.data.response.result_urls
            logger.info(f"Video generated successfully: {video_urls}")
            break
        elif status == 2:  # Failed
            logger.error(f"Video generation failed: {details.data.error_message}")
            return
        elif status == 3:  # Generation failed
            logger.error(f"Video generation failed: {details.data.error_message}")
            return
        else:
            logger.info("Still generating...")
            time.sleep(10)  # Wait 10 seconds before checking again

    # Download the video
    video_url = video_urls[0]
    download_path = "/Users/ruizeli/dev/openpromo/packages/backend/tmp/test_video.mp4"

    logger.info(f"Downloading video to {download_path}...")
    response = requests.get(video_url)
    with open(download_path, "wb") as f:
        f.write(response.content)
    logger.info("Video downloaded successfully!")


def fetch_video_details(task_id: str):
    """Retrieve Veo 3.1 video details for a known task."""

    api_key = get_env_or_raise("KIE_AI_API_KEY")
    client = KieAIClient(api_key)

    logger.info("Fetching details for task %s", task_id)
    try:
        details = client.veo.get_video_details(task_id)
    finally:
        client.close()

    data = details.data
    logger.info("Task %s status=%s", task_id, data.success_flag)
    if data.response:
        urls = data.response.result_urls or []
        origin = data.response.origin_urls or []
        logger.info("Result URLs: %s", urls)
        logger.info("Original URLs: %s", origin)
    return data


def test_kie_ai_sora2_storyboard():
    """Create a Sora 2 Pro Storyboard video to verify multi-scene video generation."""

    api_key = get_env_or_raise("KIE_AI_API_KEY")
    client = KieAIClient(api_key)

    try:
        logger.info("Submitting Sora 2 Pro Storyboard task...")

        # Define storyboard shots
        shots = [
            {
                "Scene": "A cute fluffy orange-and-white kitten wearing orange headphones, sitting at a cozy indoor table with a small slice of cake on a plate, a toy fish and a silver microphone nearby, warm soft lighting, cinematic close-up, shallow depth of field, gentle ASMR atmosphere.",
                "duration": 7.5,
            },
            {
                "Scene": "The same cute fluffy orange-and-white kitten wearing orange headphones, in the same cozy indoor ASMR setup with the toy fish and microphone, the cake now finished, the kitten gently licks its lips with a satisfied smile, warm ambient lighting, cinematic close-up, shallow depth of field, calm and content mood.",
                "duration": 7.5,
            },
        ]

        task_response = client.jobs.create_storyboard_task(
            shots=shots,
            n_frames=FrameDuration.FIFTEEN_SECONDS,
            aspect_ratio=StoryboardAspectRatio.LANDSCAPE,
        )

        task_id = task_response.data.task_id
        logger.info(
            "Sora 2 Storyboard task %s created (waiting for completion)", task_id
        )

        while True:
            details = client.jobs.get_task_details(task_id)
            state_value = details.data.state
            logger.info("Sora 2 Storyboard task %s state=%s", task_id, state_value)

            try:
                state_enum = TaskState(state_value)
            except ValueError:
                state_enum = None

            if state_enum == TaskState.SUCCESS:
                break
            if state_enum == TaskState.FAIL:
                logger.error(
                    "Sora 2 Storyboard task %s failed: %s",
                    task_id,
                    details.data.fail_msg,
                )
                return details

            time.sleep(10)  # Storyboard takes longer, poll every 10s

        # Extract video URL
        video_url = client.jobs.extract_video_url(details)
        logger.info("Sora 2 Storyboard video generated: %s", video_url)

        # Download the video
        download_path = "/Users/ruizeli/dev/openpromo/packages/backend/tmp/sora2_storyboard_video.mp4"
        logger.info("Downloading video to %s...", download_path)
        response = requests.get(video_url)
        with open(download_path, "wb") as f:
            f.write(response.content)
        logger.info("Video downloaded successfully!")

        return details
    finally:
        client.close()


def test_kie_ai_nanobanana_pro():
    """Create a Nano Banana Pro image to verify job-based image generation."""

    api_key = get_env_or_raise("KIE_AI_API_KEY")
    client = KieAIClient(api_key)
    image_path = "/Users/ruizeli/dev/openpromo/packages/backend/tmp/generated_images/4049de4050.png"
    try:
        logger.info("Uploading reference image for Nano Banana...")
        upload_result = client.upload.upload_file_stream(
            file_path=image_path,
            upload_path="images/nanobanana",
            file_name="ref_nanobanana.png",
        )
        reference_url = upload_result.data.download_url

        logger.info("Submitting Nano Banana Pro task...")
        task_response = client.jobs.create_nanobanana_task(
            prompt="A stylized hero shot of the hydration bottle floating above a reflective black surface",
            image_input=[reference_url],
            aspect_ratio=NanoBananaAspectRatio.LANDSCAPE_16_9,
            resolution=NanoBananaResolution.TWO_K,
            output_format=NanoBananaOutputFormat.PNG,
        )

        task_id = task_response.data.task_id
        logger.info("Nano Banana task %s created (waiting for completion)", task_id)

        while True:
            details = client.jobs.get_task_details(task_id)
            state_value = details.data.state
            logger.info("Nano Banana task %s state=%s", task_id, state_value)

            try:
                state_enum = TaskState(state_value)
            except ValueError:
                state_enum = None

            if state_enum == TaskState.SUCCESS:
                break
            if state_enum == TaskState.FAIL:
                logger.error("Nano Banana task %s failed", task_id)
                return details

            time.sleep(5)

        payload = client.jobs.get_task_result_payload(details)
        if not payload:
            logger.warning(
                "Nano Banana task %s completed without parsable result_json",
                task_id,
            )
            return details

        logger.info(
            "Nano Banana result payload result_urls=%s origin_urls=%s",
            payload.result_urls,
            payload.origin_urls,
        )

        return details
    finally:
        client.close()


def test_ideogram_character():
    """Test Ideogram Character generation with a reference portrait."""

    api_key = get_env_or_raise("KIE_AI_API_KEY")
    client = KieAIClient(api_key)

    # High-quality portrait from Unsplash
    reference_image = (
        "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800"
    )

    try:
        logger.info("Submitting Ideogram Character task...")
        task_response = client.jobs.create_ideogram_character_task(
            prompt="Place this woman in a cozy coffee shop, sitting by the window with warm morning light, holding a latte, casual outfit",
            reference_image_urls=[reference_image],
            rendering_speed=IdeogramRenderingSpeed.BALANCED,
            style=IdeogramStyle.REALISTIC,
            expand_prompt=True,
            image_size=IdeogramImageSize.SQUARE_HD,
            num_images=IdeogramNumImages.ONE,
        )

        task_id = task_response.data.task_id
        logger.info(
            "Ideogram Character task %s created (waiting for completion)", task_id
        )

        while True:
            details = client.jobs.get_task_details(task_id)
            state_value = details.data.state
            logger.info("Ideogram Character task %s state=%s", task_id, state_value)

            try:
                state_enum = TaskState(state_value)
            except ValueError:
                state_enum = None

            if state_enum == TaskState.SUCCESS:
                break
            if state_enum == TaskState.FAIL:
                logger.error(
                    "Ideogram Character task %s failed: %s",
                    task_id,
                    details.data.fail_msg,
                )
                return details

            time.sleep(5)

        # Extract result
        payload = client.jobs.get_task_result_payload(details)
        if not payload:
            logger.warning(
                "Ideogram Character task %s completed without parsable result_json",
                task_id,
            )
            return details

        logger.info("Ideogram Character generated!")
        logger.info("Result URLs: %s", payload.result_urls)
        logger.info("Origin URLs: %s", payload.origin_urls)

        # Download first image
        if payload.result_urls:
            image_url = payload.result_urls[0]
            download_path = "/Users/ruizeli/dev/openpromo/packages/backend/tmp/ideogram_character.png"
            logger.info("Downloading image to %s...", download_path)
            response = requests.get(image_url)
            with open(download_path, "wb") as f:
                f.write(response.content)
            logger.info("Image downloaded successfully!")

        return details
    finally:
        client.close()


if __name__ == "__main__":
    from dotenv import load_dotenv

    load_dotenv()
    # test_kie_ai_veo31()
    # test_kie_ai_nanobanana_pro()
    # test_kie_ai_sora2_storyboard()
    # fetch_video_details("f7faff8419c91d36a51c88b6070bbe1e")
    test_ideogram_character()
