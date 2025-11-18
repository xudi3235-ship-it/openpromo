import asyncio
import os
import uuid
from pathlib import Path
from typing import Literal

import replicate
from google import genai
from google.adk.tools import ToolContext
from google.genai.types import GenerateContentResponse, GeneratedVideo, Video
from google.genai.types import Image as GeminiImage
from openai import OpenAI
from PIL import Image
from PIL.ImageFile import ImageFile
from pydantic import BaseModel


def get_env_or_raise(key: str) -> str:
    value = os.environ.get(key)
    if not value:
        raise ValueError(f"{key} not set in environment variables")
    return value


def oai() -> OpenAI:
    return OpenAI(api_key=get_env_or_raise("OPENAI_API_KEY"))


def gemini():
    return genai.Client(
        api_key=get_env_or_raise("GEMINI_API_KEY"),
    )


def rep() -> replicate.Client:
    return replicate.Client(api_token=get_env_or_raise("REPLICATE_API_TOKEN"))


class NanoBananOutput(BaseModel):
    images: list[GeminiImage]
    image_paths: list[str]
    text_output: str
    prompt: str


async def run_gemini_nano_banana(
    prompt: str,
    tool_context: ToolContext,
    img_paths: list[str] = [],
) -> NanoBananOutput:
    """
    Run the Gemini Nano Banana model with the given prompt and image paths. Auto-saves generated images to the images_paths
    Args:
        prompt: The text prompt to guide image generation.
        img_paths: A list of file paths to input images. Optional, defaults to an empty list. paths have to exist! use shell tool to ensure.
    """
    client = genai.Client(api_key=get_env_or_raise("GEMINI_API_KEY"))
    MODEL_ID = "gemini-2.5-flash-image"
    imgs: list[ImageFile] = [Image.open(p) for p in img_paths]
    print(f"Running Gemini Nano Banana with prompt: {prompt} and {len(imgs)} images")

    if not Path("./tmp/generated_images/").exists():
        Path("./tmp/generated_images/").mkdir(parents=True, exist_ok=True)

    response: GenerateContentResponse = client.models.generate_content(
        model=MODEL_ID,
        contents=[prompt, *imgs],
    )
    if not response.parts:
        raise ValueError("No parts in response")
    out: NanoBananOutput = NanoBananOutput(
        images=[], image_paths=[], prompt=prompt, text_output=""
    )
    for part in response.parts:
        if part.text is not None:
            print(part.text)
            out.text_output += part.text
        elif part.inline_data is not None:
            image: GeminiImage | None = part.as_image()
            if image is None:
                continue
            image_path = f"./tmp/generated_images/{uuid.uuid4().hex[:10]}.png"

            if not image.image_bytes:
                print("No image bytes found in the generated image part.")
                continue
            with open(image_path, "wb") as f:
                f.write(image.image_bytes)
            out.images.append(image)
            out.image_paths.append(image_path)
            # save artifact to tool context as well
            report_artifact = genai.types.Part.from_bytes(
                data=image.image_bytes, mime_type="image/png"
            )
            await tool_context.save_artifact(image_path, report_artifact)
    return out


async def run_gemini_veo31(
    prompt: str,
    output_path: str,
    prev_video_path: str | None = None,
    reference_images: list[str] | None = None,
):
    """powerful, single api for video generation and extension using Gemini VEO-3.1 model. this tool is capabale of text to video, images to video(with references), and video extension(using previous video as base). it runs, polls, and downloads the generated video.

    full doc: https://ai.google.dev/gemini-api/docs/video.md.txt

    Args:
        prompt: text prompt for video generation
        output_path: path to save the generated video
        prev_video_path: optional, previously generated video path to use as a base. this is used for video extension.
        reference_images: list of image paths to use as reference images for chracter, product, style, etc. up to 3.
    """
    reference_images = reference_images or []
    if len(reference_images) > 3:
        raise ValueError("Maximum of 3 reference images are allowed.")

    reference_images_objs = [
        genai.types.VideoGenerationReferenceImage(
            image=GeminiImage.from_file(location=path)
        )
        for path in reference_images
    ]

    client = genai.Client(api_key=get_env_or_raise("GEMINI_API_KEY"))

    prev_video = Video.from_file(location=prev_video_path) if prev_video_path else None

    operation = client.models.generate_videos(
        model="veo-3.1-generate-preview",
        prompt=prompt,
        video=prev_video,
        # https://ai.google.dev/gemini-api/docs/video?example=dialogue#veo-model-parameters
        config=genai.types.GenerateVideosConfig(
            reference_images=reference_images_objs,
            number_of_videos=1,
            duration_seconds=8,
            resolution="720p",
            aspect_ratio="9:16",
        ),
    )
    # poll until done
    while not operation.done:
        print("Waiting for video generation to complete...")
        await asyncio.sleep(10)
        operation = client.operations.get(operation)
    # download the video
    resp = operation.response
    if not resp or not resp.generated_videos:
        raise ValueError("No video generated.")
    generated_video: GeneratedVideo = resp.generated_videos[0]
    video = generated_video.video
    if not video:
        raise ValueError("No video found in the generated video.")

    client.files.download(file=video)
    video.save(output_path)
    print(f"Generated video saved to {output_path}")
    return {
        "status": "success",
        "message": f"Video generated and saved to {output_path}",
        "output_path": output_path,
    }


def read_docs_guide(
    category: Literal[
        "veo31",
        "nanobanana",
        "imagen4",
        "image_understanding",
    ],
) -> str:
    """reads available prompts guide. useful for you to learn how to use these different tools / models, their capabiltiies.
    Args:
        category: veo31: reads veo3.1 prompt guide, details on how to craft prompts for veo3.1 model.
                nanobanana: reads nanobanana prompt guide, details on how to craft prompts for
                imagen4: reads imagen 4 prompt guide, details on how to craft prompts for imagen 4 model. Text/image to image gen.
                image_understanding: capabilties like image segmentation, object detection etc.
                ... more models can be added here.


    Returns:
        The content of the prompt guide as a string.

    """
    match category:
        case "veo31":
            return StaticPrompts.veo31_from_url()
        case "nanobanana":
            return StaticPrompts.nano_banana_prompt_guide_from_url()
        case "imagen4":
            return StaticPrompts.imagen_4_from_url()
        case "image_understanding":
            return StaticPrompts.image_understanding_guide_from_url()
        case _:  # pyright: ignore[reportUnnecessaryComparison]
            raise ValueError(f"Unsupported category type: {category}")  # pyright: ignore[reportUnreachable]


class StaticPrompts:
    @staticmethod
    def veo31_from_url():
        url = "https://ai.google.dev/gemini-api/docs/video.md.txt"
        return StaticPrompts.fetch_url_content(url)

    @staticmethod
    def imagen_4_from_url():
        return StaticPrompts.fetch_url_content(
            "https://ai.google.dev/gemini-api/docs/imagen.md.txt"
        )

    @staticmethod
    def nano_banana_prompt_guide_from_url():
        return StaticPrompts.fetch_url_content(
            "https://ai.google.dev/gemini-api/docs/image-generation.md.txt"
        )

    @staticmethod
    def image_understanding_guide_from_url():
        return StaticPrompts.fetch_url_content(
            "https://ai.google.dev/gemini-api/docs/image-understanding.md.txt"
        )

    @staticmethod
    def fetch_url_content(url: str) -> str:
        import requests

        response = requests.get(url)
        if response.status_code == 200:
            return response.text
        else:
            raise ValueError(
                f"Failed to fetch content from {url}, status code: {response.status_code}"
            )


async def run_shell_cmd(cmd: str) -> dict[str, str]:
    """Executes a shell command and returns the output.
    Args:
        cmd: str, the shell command to execute.
    Returns:
        A dictionary with the status and output or error message.
    """
    import subprocess

    try:
        result = subprocess.run(
            cmd,
            shell=True,
            check=True,
            capture_output=True,
            text=True,
            cwd="./tmp",
        )
        return {"status": "success", "output": result.stdout, "error": result.stderr}
    except subprocess.CalledProcessError as e:
        return {"status": "error", "error": str(e)}


async def load_image(image_path: str, tool_context: ToolContext):
    """loads image from local path and prepares it as a part for genai api tool context."""
    await tool_context.load_artifact(image_path)
    print(f"Image loaded to artifact context: {image_path}")
    return {
        "status": "success",
        "message": f"Image generated .  ADK artifact: {image_path}.",
        "artifact_name": image_path,
    }
