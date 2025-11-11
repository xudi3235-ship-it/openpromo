"""
code for implementing product image generation.
"""

import os
from dataclasses import dataclass
from io import BufferedReader

from src.core.shared import oai, rep


@dataclass
class ImageGenOutput:
    url: str
    buffer: bytes


def run_nano_banana(
    prompt: str, image_inputs: list[str | BufferedReader] = []
) -> ImageGenOutput:
    output = rep().run(
        "google/nano-banana",
        input={
            "prompt": prompt,
            "image_input": image_inputs,
            "aspect_ratio": "match_input_image",
            "output_format": "jpg",
        },
    )
    return ImageGenOutput(url=output.url, buffer=output.read())  # pyright: ignore[reportAttributeAccessIssue]


def run_seedream_4(
    prompt: str,
    image_inputs: list[str | BufferedReader] = [],
    aspect_ratio: str = "3:4",
) -> ImageGenOutput:
    output = rep().run(
        "bytedance/seedream-4",
        input={
            "size": "4K",
            # "width": 2048,
            # "height": 2048,
            "prompt": prompt,
            "max_images": 1,
            "image_input": image_inputs,
            "aspect_ratio": aspect_ratio,
            "sequential_image_generation": "disabled",
        },
    )
    return ImageGenOutput(url=output.url, buffer=output.read())  # pyright: ignore[reportAttributeAccessIssue]


def run_openai_gpt_image_1(
    prompt: str,
    image_inputs: list[str | BufferedReader] = [],
):
    output = rep().run(
        "openai/gpt-image-1",
        input={
            "prompt": prompt,
            "quality": "auto",
            "background": "auto",
            "moderation": "auto",
            "aspect_ratio": "1:1",
            "input_images": image_inputs,
            "output_format": "webp",
            "input_fidelity": "low",
            "openai_api_key": os.environ.get("OPENAI_API_KEY"),
            "number_of_images": 1,
            "output_compression": 90,
        },
    )
    return ImageGenOutput(url=output[0].url, buffer=output[0].read())  # pyright: ignore[reportIndexIssue]


def run_style_image_gen_v2(
    user_input: str,
    style_image_ref_urls: list[str],
    product_image_urls: list[str],
) -> str:
    # prompt: https://platform.openai.com/chat/edit?lang=python&prompt=pmpt_68ff0d90439c8196be84f928d5f2546b0df830bb02f714b6&version=12
    # 0. input
    # 1. run openai call
    response = oai().responses.create(
        prompt={
            "id": "pmpt_68ff0d90439c8196be84f928d5f2546b0df830bb02f714b6",
            "variables": {"user_input": user_input},
        },
        input=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "input_text",
                        "text": "here are the style image references",
                    },
                    *[
                        {"type": "input_image", "image_url": url, "detail": "auto"}
                        for url in style_image_ref_urls
                    ],
                    {
                        "type": "input_text",
                        "text": "here are my product images",
                    },
                    *[
                        {"type": "input_image", "image_url": url, "detail": "auto"}
                        for url in product_image_urls
                    ],
                ],
            }
        ],
        reasoning={"summary": None},
        store=True,
        include=["reasoning.encrypted_content", "web_search_call.action.sources"],
    )
    # 2. parse output
    return response.output_text


def gen_prompt_for_product_image_shot(
    user_input: str, use_creative_template: str
) -> str:
    response = oai().responses.create(
        prompt={
            "id": "pmpt_68fc6f98ca3c819396a49fdfe133bb3d0d83a6a0c5c7ade9",
            "variables": {
                "user_input": user_input,
                "use_creative_template": use_creative_template,
            },
        },
        input=[],
        reasoning={"summary": "auto"},
        store=True,
        include=["reasoning.encrypted_content", "web_search_call.action.sources"],
    )
    return response.output_text


def test_product_shot_gen():
    style_ref = (
        "https://i.pinimg.com/736x/a5/d8/29/a5d829c75ba8e1d8114204116812779e.jpg"
    )
    product_img = (
        "https://i.pinimg.com/736x/55/6b/85/556b85f58d765d763cd5010531037322.jpg"
    )

    prompt = run_style_image_gen_v2(
        "1st image is style ref, 2nd image is my product", [style_ref], [product_img]
    )
    # next, gen img
    img = run_nano_banana(prompt, [style_ref, product_img])
    print(img.url)
    pass
