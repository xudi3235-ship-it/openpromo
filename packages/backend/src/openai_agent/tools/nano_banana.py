import uuid
from pathlib import Path

from agents import function_tool
from google import genai
from google.genai.types import GenerateContentResponse
from google.genai.types import Image as GeminiImage
from PIL import Image
from PIL.ImageFile import ImageFile
from pydantic import BaseModel

from src.core.shared import get_env_or_raise


class NanoBananOutput(BaseModel):
    images: list[GeminiImage]
    image_paths: list[str]
    text_output: str
    prompt: str


@function_tool
async def run_gemini_nano_banana(
    prompt: str,
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
    # make the paths are ./tmp/...
    img_paths = [p if p.startswith("./tmp/") else f"./tmp/{p}" for p in img_paths]
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
    return out
