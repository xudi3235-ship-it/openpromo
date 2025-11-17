import os
import uuid
from pathlib import Path

import replicate
from google import genai
from google.genai.types import GenerateContentResponse
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
    _raw: GenerateContentResponse
    images: list[GeminiImage]
    image_paths: list[str]


def run_gemini_nano_banana(
    prompt: str,
    img_paths: list[str],
) -> NanoBananOutput:
    """
    Run the Gemini Nano Banana model with the given prompt and image paths.
    """
    client = genai.Client(api_key=get_env_or_raise("GEMINI_API_KEY"))
    MODEL_ID = "gemini-2.5-flash-image"
    imgs: list[ImageFile] = [Image.open(p) for p in img_paths]
    print(f"Running Gemini Nano Banana with prompt: {prompt} and {len(imgs)} images")

    response: GenerateContentResponse = client.models.generate_content(
        model=MODEL_ID,
        contents=[prompt, *imgs],
    )
    # create a base base name from the img_paths
    base_name = "_".join([Path(p).stem for p in img_paths])
    if not response.parts:
        raise ValueError("No parts in response")
    print(f"Received {len(response.parts)} parts in response")
    out: NanoBananOutput = NanoBananOutput(_raw=response, images=[], image_paths=[])
    for part in response.parts:
        if part.text is not None:
            print(part.text)
        elif part.inline_data is not None:
            image: GeminiImage | None = part.as_image()
            if image is not None:
                image_path = (
                    f"./tmp/generated_images/{base_name + uuid.uuid4().hex}.png"
                )
                if not Path("./tmp/generated_images/").exists():
                    Path("./tmp/generated_images/").mkdir(parents=True, exist_ok=True)
                with open(image_path, "wb") as f:
                    f.write(image.image_bytes)  # pyright: ignore[reportArgumentType]
                image.save(image_path)
                out.images.append(image)
                out.image_paths.append(image_path)
    return out
