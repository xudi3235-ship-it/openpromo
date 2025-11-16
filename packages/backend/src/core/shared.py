import os

import replicate
from google import genai
from google.genai.types import ContentUnionDict, GenerateContentResponse
from openai import OpenAI
from PIL import Image


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


def run_nano_banana(
    image_paths: list[str], prompt: str, contents: ContentUnionDict = {}
):
    """
    might generate multiple images
    """
    MODEL_ID = "gemini-2.5-flash-image"
    images = [Image.open(path) for path in image_paths]

    response: GenerateContentResponse = gemini().models.generate_content(
        model=MODEL_ID,
        contents=[contents, prompt, *images],
    )
    output_images = []
    if not response.parts:
        raise ValueError("No parts in response")
    for part in response.parts:
        if part.text:
            print(part.text)
        elif image := part.as_image():
            output_images.append(image)
    return output_images
