import asyncio
import logging
import os
from pathlib import Path
from langchain_openai import ChatOpenAI
from playwright.async_api import Page

from browser_use import Agent, Controller
from browser_use.agent.views import ActionResult
from browser_use.browser import BrowserProfile, BrowserSession
from dotenv import load_dotenv

load_dotenv()


logger = logging.getLogger(__name__)

"""
In this script, we'll use the llm to automate actions on TikTok's web interface.
Tasks will include the following:
1. Login flow (using QR code, user input required)
2. searching
3. video uploading
4. video interaction - liking, commenting, etc.

Here we design the interfaces:
1. multiple agents, each specialized in a task on tiktok. Shared browser session.
2. each task --> planning -> create a state machine --> assign agents for each task.
3. proper hand offs between agents
4. flows: login, video upload.

BaseTikTokAgent:
--> handles login flow
"""

# Initialize browser and controller
browser_profile = BrowserProfile(
    # NOTE: you need to close your chrome browser - so that this can open your browser in debug mode
    executable_path="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    user_data_dir="~/.config/browseruse/profiles/default",
    headless=False,
    keep_alive=True,
)

controller = Controller()


@controller.action("Check if user is logged in on tiktok.com")
async def is_user_logged_in():
    # FIXME: not reliable, best to integrated into a agent-based login flow.
    import sqlite3

    # Resolve the cookies DB path
    user_data_dir = os.path.expanduser("~/.config/browseruse/profiles/default")
    cookies_db_path = os.path.join(user_data_dir, "Default", "Cookies")

    if not os.path.exists(cookies_db_path):
        return ActionResult(error="Cookies database not found.")

    try:
        conn = sqlite3.connect(cookies_db_path)
        cursor = conn.cursor()
        cursor.execute(
            "SELECT name, host_key, value FROM cookies WHERE host_key LIKE '%tiktok%'"
        )
        cookies = cursor.fetchall()
        conn.close()

        # Check for sessionid or similar login cookie
        logged_in = any(
            name.lower() in ("sessionid", "sid_tt", "passport_csrf_token")
            for name, _, _ in cookies
        )

        if logged_in:
            msg = "User appears to be logged in on tiktok.com."
            logger.info(msg)
            return ActionResult(extracted_content=msg, include_in_memory=True)
        else:
            msg = "User is not logged in on tiktok.com."
            logger.info(msg)
            return ActionResult(error=msg)
    except Exception as e:
        msg = f"Error checking login status: {e}"
        logger.error(msg)
        return ActionResult(error=msg)


@controller.action("Ask human to scan QR code for TikTok login")
async def ask_human_scan_qr_code():
    answer = input("Scan the QR code, when done enter Y > ")
    msg = f"The human responded with: {answer}"
    logger.info(msg)
    return ActionResult(extracted_content=msg, include_in_memory=True)


@controller.action("Upload video file to TikTok")
async def upload_video_file(
    index: int,
    path: str,
    browser_session: BrowserSession,
    page: Page,
    available_file_paths: list[str],
):
    if path not in available_file_paths:
        raise ValueError(
            f"Path {path} is not in the list of available file paths: {available_file_paths}"
        )

    if not os.path.exists(path):
        raise FileNotFoundError(f"File not found: {path}")

    logger.info(f"{upload_video_file.__name__}: {index=}, {path=}")

    try:
        # Find the hidden file input element by its attributes
        # More robust locator: find the input[type="file"] inside the main upload container
        file_input = await page.locator(
            'div[data-e2e="select_video_container"] input[type="file"][accept="video/*"]'
        ).element_handle()

        if not file_input:
            msg = "No file input element found"
            logger.error(msg)
            return ActionResult(error=msg)

        # Upload the file directly to the hidden input
        await file_input.set_input_files(path)

        msg = f"Successfully uploaded video file: {path}"
        logger.info(msg)
        return ActionResult(extracted_content=msg, include_in_memory=True)

    except Exception as e:
        msg = f"Failed to upload video file: {str(e)}"
        logger.error(msg)
        return ActionResult(error=msg)


def create_sample_video():
    """Create a sample video file for testing"""
    sample_path = Path.cwd() / "sample.mp4"
    if not sample_path.exists():
        # Create a dummy file for testing - in real usage, this should be a real video
        with open(sample_path, "wb") as f:
            f.write(b"dummy video content")
    logger.info(f"Sample video file: {sample_path}")
    return str(sample_path)


async def main():
    task = """
    Goto https://www.tiktok.com/tiktokstudio/upload?from=webapp
    Upload the video to the upload field.
    When using index to select the file upload field, use the bigger container that has the drag and drop area + the file upload button.
    If unable to find the file upload field, try again with larger area index.
    RULES:
    1. DO NOT CLICK the upload button, use the upload_video_file action to handle it.
    2. use the large container that's taking about 1/3 of the screen which wraps the drag and drop area and the file upload button to select the file upload field.
    """

    # task = "Go to https://kzmpmkh2zfk1ojnpxfn1.lite.vusercontent.net/ and - read the file content and upload them to fields"

    available_file_paths = [create_sample_video()]

    model = ChatOpenAI(model="gpt-4o-mini", temperature=0.0)
    browser_session = BrowserSession(browser_profile=browser_profile)
    await browser_session.start()

    # If your Agent class is now generic and expects a Context instance,
    # you need to create or provide a context object and pass it as an argument.
    # For example, if your context is a dictionary or a custom class:
    context = {
        "browser_session": browser_session,
        "available_file_paths": available_file_paths,
    }

    agent = Agent(
        task=task,
        llm=model,
        controller=controller,
        browser_session=browser_session,
        available_file_paths=available_file_paths,
        save_conversation_path="logs/tiktok_upload_conversation",
        context=context,  # <-- pass the context here
    )

    await agent.run()
    await browser_session.close()


if __name__ == "__main__":
    asyncio.run(main())
