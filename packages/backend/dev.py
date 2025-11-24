import asyncio

from agents import (
    Runner,
    TResponseInputItem,
    trace,
)
from dotenv import load_dotenv
from openai.types.responses.response_input_item_param import Message

from src.openai_agent.agents import composer_agent
from src.openai_agent.agents.main_agent import main_agent
from src.openai_agent.context import ProductContext, RuntimeContext, UserContext
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


def create_user_input() -> Message:
    user_msg = """
    here's the product.
    I wanna create tiktok style ugc video for this water bottle.
    I wanna feature a feature a 28yo mixed race female.
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
    runtime_context = RuntimeContext(
        user_context=UserContext(
            product=ProductContext(
                name="Hydration Water Bottle",
                description="A sleek, insulated water bottle that keeps drinks cold for 24 hours and hot for 12 hours.",
                images=["./tmp/products/bottle.jpg"],
                target_audience="Active individuals, athletes, and outdoor enthusiasts.",
                selling_points="Durable stainless steel construction, leak-proof lid, and eco-friendly design.",
                extra={},
            ),
            business="A startup focused on sustainable and innovative hydration solutions.",
            extra={},
        ),
        stage_contexts=[],
    )
    with trace("Video Generation workflow"):
        # init agent
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
            if user_input.strip().lower() == "clear":
                print(">>> clearing the agent conversation...")
                current_agent = main_agent
                current_input_items = init_input
                continue
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
                context=runtime_context,
            )
            current_agent = result.last_agent
            current_input_items = result.to_input_list()


if __name__ == "__main__":
    import asyncio

    asyncio.run(run_agent())
