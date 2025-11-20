import uuid
from pathlib import Path
from typing import Literal

from agents import function_tool
from google import genai
from google.genai.types import GenerateContentConfig, ImageConfig
from google.genai.types import Image as GeminiImage
from PIL import Image
from PIL.ImageFile import ImageFile
from pydantic import BaseModel, Field

from src.core.shared import get_env_or_raise


class NanoBananaOutput(BaseModel):
    images: list[GeminiImage]
    image_paths: list[str]
    text_output: str
    prompt: str


class ConfigParams(BaseModel):
    aspect_ratio: Literal["1:1", "2:3", "3:2", "3:4", "4:3", "9:16", "16:9"] = Field(
        default="1:1", description="Aspect ratio of the generated image."
    )
    image_size: Literal["1K", "2K", "4K"] = Field(
        default="1K", description="Size of the generated image."
    )


@function_tool
async def run_gemini_nano_banana(
    prompt: str,
    config_params: ConfigParams,
    img_paths: list[str] | None = None,
    use_pro_model: bool = False,
) -> NanoBananaOutput:
    """
    Run the Gemini Nano Banana model with the given prompt and image paths. Auto-saves generated images to the images_paths

    for advanced, maximum quality prefer to use pro model.
    Args:
        prompt: The text prompt to guide image generation.
        config_params: Configuration parameters for image generation, e.g. aspect ratio, image size.
        img_paths: A list of file paths to input images. Optional, defaults to an empty list. paths have to exist! use shell tool to ensure.
        use_pro_model: If True, uses the pro version model, with higher quality, details, and understanding.
    """
    client = genai.Client(api_key=get_env_or_raise("GEMINI_API_KEY"))
    if img_paths is None:
        img_paths = []

    # make the paths are ./tmp/...
    img_paths = [p if p.startswith("./tmp/") else f"./tmp/{p}" for p in img_paths]
    imgs: list[ImageFile] = [Image.open(p) for p in img_paths]
    print(f"Running Gemini Nano Banana with prompt: {prompt} and {len(imgs)} images")

    if not Path("./tmp/generated_images/").exists():
        Path("./tmp/generated_images/").mkdir(parents=True, exist_ok=True)

    MODEL_ID = (
        "gemini-3-pro-image-preview" if use_pro_model else "gemini-2.5-flash-image"
    )
    response = client.models.generate_content(
        model=MODEL_ID,
        contents=[prompt, *imgs],
        config=GenerateContentConfig(
            response_modalities=["IMAGE"],
            image_config=ImageConfig(
                image_size=config_params.image_size,
                aspect_ratio=config_params.aspect_ratio,
            ),
        ),
        # config={"response_modalities": ["IMAGE"], "image_config": {"image_size": ""}},
    )
    if not response.parts:
        raise ValueError("No parts in response")
    out: NanoBananaOutput = NanoBananaOutput(
        images=[], image_paths=[], prompt=prompt, text_output=""
    )
    for part in response.parts:
        if part.text is not None:
            print(part.text)
            out.text_output += part.text
        elif part.inline_data is not None:
            image = part.as_image()
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
