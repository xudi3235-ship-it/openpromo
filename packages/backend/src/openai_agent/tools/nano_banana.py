import uuid
from pathlib import Path
from typing import Literal

from agents import function_tool
from google import genai
from google.genai.types import (
    GenerateContentConfig,
    GenerateContentResponse,
    ImageConfig,
)
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
    error: str | None = None


class ConfigParams(BaseModel):
    aspect_ratio: Literal["1:1", "2:3", "3:2", "3:4", "4:3", "9:16", "16:9"] = Field(
        default="1:1", description="Aspect ratio of the generated image."
    )
    image_size: Literal["1K", "2K", "4K"] = Field(
        default="1K", description="Size of the generated image."
    )


def _prepare_image_inputs(img_paths: list[str] | None) -> list[ImageFile]:
    if img_paths is None:
        return []
    # make the paths are ./tmp/...
    fixed_paths = [p if p.startswith("./tmp/") else f"./tmp/{p}" for p in img_paths]
    return [Image.open(p) for p in fixed_paths]


def _save_generated_images(
    response: GenerateContentResponse, prompt: str
) -> NanoBananaOutput:
    if not response.parts:
        raise ValueError("No parts in response")

    out: NanoBananaOutput = NanoBananaOutput(
        images=[], image_paths=[], prompt=prompt, text_output=""
    )

    if not Path("./tmp/generated_images/").exists():
        Path("./tmp/generated_images/").mkdir(parents=True, exist_ok=True)

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


async def generate_images_core(
    prompt: str,
    config_params: ConfigParams,
    img_paths: list[str] | None = None,
) -> NanoBananaOutput:
    print("args: ", prompt, config_params, img_paths)
    client = genai.Client(api_key=get_env_or_raise("GEMINI_API_KEY"))

    imgs = _prepare_image_inputs(img_paths)
    print(f"Running Gemini Nano Banana with prompt: {prompt} and {len(imgs)} images")

    MODEL_ID = "gemini-3-pro-image-preview"  # for pro model
    try:
        response = client.models.generate_content(
            model=MODEL_ID,
            contents=[prompt, *imgs],
            config=GenerateContentConfig(
                response_modalities=["IMAGE", "TEXT"],
                image_config=ImageConfig(
                    image_size=config_params.image_size,
                    aspect_ratio=config_params.aspect_ratio,
                ),
            ),
        )
    except Exception as e:
        print(f"Error during image generation: {e}")
        return NanoBananaOutput(
            images=[],
            image_paths=[],
            prompt=prompt,
            text_output="error when generating image",
            error=str(e),
        )
    return _save_generated_images(response, prompt)


@function_tool
async def run_gemini_nano_banana(
    prompt: str,
    config_params: ConfigParams,
    img_paths: list[str] | None = None,
) -> NanoBananaOutput:
    """
    Run the Gemini Nano Banana model with the given prompt and image paths. Auto-saves generated images to the images_paths. Powered by nano banana pro.

    for image_size, if need more details & higher quality, use 2K or 4K.

    Args:
        prompt: The text prompt to guide image generation.
        config_params: Configuration parameters for image generation, e.g. aspect ratio, image size. Defaul
        img_paths: A list of file paths to input images. Optional, defaults to an empty list. paths have to exist! use shell tool to ensure.
    """
    return await generate_images_core(prompt, config_params, img_paths)


async def test_gemini_nano_banana():
    print("Running test_gemini_nano_banana...")
    output = await generate_images_core(
        prompt="Ultra-realistic vertical smartphone photo, TikTok-style UGC frame. A 28-year-old woman with warm medium-brown skin, natural curly shoulder-length hair, and an athletic build is sitting cross-legged on a yoga mat in a bright modern living room, casual athleisure outfit in muted earth tones. She holds the exact dark green reusable water bottle from the product photo clearly in her right hand close to the camera, label and measurement marks clean and undistorted, lid and carry handle matching the reference product image. The camera is slightly below eye level, focusing sharply on the bottle in the foreground with gentle depth of field so her face and cozy living room background are softly blurred. Natural soft daylight from a side window, subtle reflections on the bottle, realistic shadows on the floor. No overexposed highlights, no dramatic studio lighting—just authentic phone camera vibe, slight hand-held feel, perfect for a TikTok hook shot. No on-screen text or graphics, no extra props besides a neatly rolled towel and a plant in the background.\n<negative_prompt>illustration, cartoon, 3D render, distorted or duplicated bottle, incorrect bottle color, missing or warped logo, unreadable measurement marks, extra fingers, extra hands, disfigured face, warped body, floating objects, extreme wide-angle distortion, harsh spotlight, cluttered background, over-saturated colors, motion blur on bottle, text overlay, captions, watermarks other than SynthID</negative_prompt>",
        config_params=ConfigParams(aspect_ratio="1:1", image_size="1K"),
        img_paths=["./tmp/products/bottle.jpg", "./tmp/reference/lifestyle.jpg"],
    )
    print(f"Generated {len(output.image_paths)} images.")
    for path in output.image_paths:
        print(f"Image saved at: {path}")


if __name__ == "__main__":
    import asyncio

    asyncio.run(test_gemini_nano_banana())
