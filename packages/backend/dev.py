import asyncio

from agents import (
    Runner,
    TResponseInputItem,
    trace,
)
from dotenv import load_dotenv
from openai.types.responses.response_input_item_param import Message
from pydantic import BaseModel

from src.openai_agent.agents import composer_agent
from src.openai_agent.agents.main import main_agent
from src.openai_agent.helpers import to_img_inputs
from src.openai_agent.hooks import ExampleHooks

load_dotenv()

"""
Nov 20, 2025.

// Experiment on video production pipeline

Our pipeline has different stages:

Stage A: brainstorm, select, and confirm the video type, style, blueprint to create. This should be grounding truth, it's top-down planning for how the shape of video will be. NOTE: later this can be enhanced with a gallery or internal collections

Stage B: image generation. Use the context, video blueprint, product img, to generate key frames, ingridients needed for next stage. Use evals to ensure the quality.

Stage C: video generation, full execution mode. use the previous runtime context along with the images, to use veo3.1 tools to create final video. It should figure out when to use text-to-video, image-to-video, extension, reference-images-to-video, etc. Use evals to ensure quality.

// Open Questions
- missing some good exmaples to structure the video blueprint.
"""


class ProductContext(BaseModel):
    name: str
    description: str
    images: list[str]
    target_audience: str
    selling_points: str
    extra: dict[str, str]


class UserContext(BaseModel):
    product: ProductContext
    business: str
    extra: dict[str, str]


class StageContext(BaseModel):
    stage_name: str
    stage_description: str
    output: str


class RuntimeContext(BaseModel):
    user_context: UserContext
    stage_contexts: list[StageContext]


def create_user_input() -> Message:
    user_msg = """
    here's the product.
    I wanna create a fast paced multiple shot, angles dynamic video for this product. using the lifestyle.jpg reference img.

    overall i wanna create a UGC style video of a 25yo mixed race girl talking about this product in her dorm. help me create a prompt image first, i will confirm with you to continue next steps for video gen
    """

    return {
        "role": "user",
        "content": [
            {
                "type": "input_text",
                "text": user_msg,
            },
            *to_img_inputs(["./tmp/products/bottle.jpg"]),
        ],
    }


async def run_agent():
    """Run the video generation workflow with the main agent."""
    init_input: list[TResponseInputItem] = [
        create_user_input(),
    ]
    with trace("Video Generation workflow"):
        current_agent = main_agent
        current_input_items: list[TResponseInputItem] = init_input
        while True:
            try:
                user_input = input(" > ")
            except (EOFError, KeyboardInterrupt):
                print()
                break
            if user_input.strip().lower() in {"exit", "quit"}:
                break
            # switch agent
            if user_input.strip().lower() in {"_next"}:
                if current_agent == composer_agent:
                    print(">>> Switching to next agent...")
                    current_agent = main_agent
            if not user_input:
                continue

            current_input_items.append({"role": "user", "content": user_input})
            result = await Runner.run(
                current_agent,
                max_turns=100,
                hooks=ExampleHooks(),
                input=current_input_items,
            )
            current_agent = result.last_agent
            current_input_items = result.to_input_list()


if __name__ == "__main__":
    import asyncio

    asyncio.run(run_agent())
