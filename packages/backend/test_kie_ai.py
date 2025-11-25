import logging
import time

import requests

from src.core.shared import get_env_or_raise
from src.sdks.kie_ai_sdk.client import KieAIClient
from src.sdks.kie_ai_sdk.models import AspectRatio, Model

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


if __name__ == "__main__":
    from dotenv import load_dotenv

    load_dotenv()
    # test_kie_ai_veo31()
    fetch_video_details("f7faff8419c91d36a51c88b6070bbe1e")
