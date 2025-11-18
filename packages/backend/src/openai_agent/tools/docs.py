from typing import Literal

from agents import function_tool


@function_tool
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
