import base64

from openai.types.responses import ResponseInputImageParam, ResponseInputItemParam

from src.core.shared import oai


def resize_image(image_path: str, output_path: str, new_size: tuple[int, int]) -> None:
    from PIL import Image

    with Image.open(image_path) as img:
        resized_img = img.resize(new_size, Image.Resampling.LANCZOS)
        resized_img.save(output_path)


def encode_image(image_path: str):
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode("utf-8")


def to_img_inputs(img_paths: list[str]) -> list[ResponseInputImageParam]:
    imgs: list[ResponseInputImageParam] = []
    for path in img_paths:
        base64_image = encode_image(path)
        imgs.append(
            {
                "type": "input_image",
                "image_url": f"data:image/jpeg;base64,{base64_image}",
                "detail": "auto",
            }
        )
    return imgs


def download_image(url: str, save_path: str) -> None:
    import os

    import requests

    # Ensure the directory exists
    os.makedirs(os.path.dirname(save_path), exist_ok=True)

    response = requests.get(url)
    response.raise_for_status()  # Raise an error for bad responses

    with open(save_path, "wb") as file:
        file.write(response.content)


def inspect_tmp_dir():
    import subprocess

    result = subprocess.run(["tree", "./tmp"], capture_output=True, text=True)
    return result.stdout


def run_image_gen_with_style_ref(
    prompt: str,
    image_ref_urls: list[str],
    history_input_items: list[ResponseInputItemParam] = [],  # pyright: ignore[reportCallInDefaultInitializer]
):
    """
    our impl of creating a image with style references
    """

    response = oai().responses.create(
        prompt={
            "id": "pmpt_68ff0d90439c8196be84f928d5f2546b0df830bb02f714b6",
            "variables": {"user_input": prompt},
        },
        input=[
            *history_input_items,
            {
                "role": "user",
                "content": [
                    {
                        "type": "input_text",
                        "text": "here are the style image references",
                    },
                    *to_img_inputs(image_ref_urls),
                ],
            },
            {
                "role": "user",
                "content": [
                    {
                        "type": "input_text",
                        "text": f"{prompt}",
                    }
                ],
            },
        ],
        reasoning={"summary": "auto"},
        store=True,
        include=["reasoning.encrypted_content", "web_search_call.action.sources"],
    )
    return response.output_text


def detect_scenes(video_path: str):
    """
    detect scenes from a video file, detects by content changes
    using opencv, useful for splitting shots
    """
    from scenedetect import ContentDetector, detect

    return detect(video_path, ContentDetector())
