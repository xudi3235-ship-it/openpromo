"""
code for implementing product image generation.
"""

import os
from typing import Optional

import replicate
from openai import OpenAI
from pydantic import BaseModel


def oai() -> OpenAI:
    return OpenAI(api_key=os.environ["OPENAI_API_KEY"])


def rep() -> replicate.Client:
    return replicate.Client(api_token=os.environ["REPLICATE_API_TOKEN"])


# ------------------------------------------------------
# Product image decomposition
# ------------------------------------------------------
class Image(BaseModel):
    url: Optional[str] = None
    description: Optional[str] = None


class ProductContext(BaseModel):
    description: str
    brand: str
    category: str
    industry: str
    tags: list[str]
    original_image: Image
    clean_bg_image: Image


def process_product_img(raw_img_url: str) -> ProductContext:
    sys_prompt = """Given a product image, identify the product and extract context about it, including meta data like brand, category, industry, tags.
    """
    response = oai().responses.parse(
        model="gpt-4.1",
        input=[
            {"role": "system", "content": sys_prompt},
            {"role": "user", "content": f"Process this image: {raw_img_url}"},
        ],
        text_format=ProductContext,
    )
    return response.output_parsed
