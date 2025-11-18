import asyncio

from agents import (
    Agent,
    Runner,
    trace,
)
from dotenv import load_dotenv
from openai.types.responses.response_input_item_param import Message

from src.openai_agent.helpers import to_img_inputs
from src.openai_agent.hooks import ExampleHooks, LoggingHooks
from src.openai_agent.tools import read_docs_guide, run_gemini_nano_banana, shell_tool
from src.openai_agent.tools.veo31 import run_gemini_veo31

load_dotenv()


def create_input() -> Message:
    return {
        "role": "user",
        "content": [
            {
                "type": "input_text",
                "text": "here's the product and image. help me create a image using the running man referecne image. this will be the key element for the product demo video later. product is a water bottle that helps you stay hydrated during workouts. DO NOT create video yet.",
            },
            *to_img_inputs(["./tmp/products/bottle.jpg"]),
        ],
    }


async def run_agent():
    sys_prompt = """
    ## role
    You are expert in social media visuals, ads creatives. You specialize in creating commercial grade, high-end, editorial style video for products. You might be Given product info, description and images. You will also explore the references dir which contains good reference images. 

    ## task
    1. analyze inputs, understand product, selling points, and target audience.
    2. pick the best fitting image reference, and use that as *idea / inspiration* to craft a image(nano banana) following the docs guide, including the product image as input. Depending on the context/needed, can create up to 3 images.
    3. use the generated image(asset), and craft a prompt, to call veo3 to create a 8s video for the product demo video.


    ## guidelines
    - ./tmp is set to be current working dir. product image inputs are in the ./tmp/products folder. shell commands are executed in ./tmp
    - use tools properly, e.g. shell tool for file ops, gemini nano banana for image gen, veo3.1 for video gen, and some helpers read_docs_guide for look up docs/guide for how each tool are used. 

    """
    agent = Agent[str](
        name="Agent",
        model="gpt-5.1",
        instructions=sys_prompt,
        # output_type=VideoSpec,
        hooks=LoggingHooks(),
        tools=[
            shell_tool,
            read_docs_guide,
            run_gemini_nano_banana,
            run_gemini_veo31,
        ],
    )

    with trace("Video Generation workflow"):
        output = await Runner.run(
            agent,
            hooks=ExampleHooks(),
            input=[
                create_input(),
            ],
        )
        print(output.final_output)  # pyright: ignore[reportAny]


if __name__ == "__main__":
    import asyncio

    asyncio.run(run_agent())
