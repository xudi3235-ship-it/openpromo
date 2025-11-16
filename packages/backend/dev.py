import base64

from agents import Agent, Runner
from dotenv import load_dotenv
from openai.types.responses import ResponseInputImageParam, ResponseInputItemParam

from src.core.shared import oai

load_dotenv()


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


async def run_agent():
    from agents import SQLiteSession

    # Create agent
    agent = Agent[str](
        name="Assistant",
        instructions="Reply very concisely.",
    )

    # Create a session instance
    session = SQLiteSession(
        "conversation_123",
    )

    # First turn
    result = await Runner.run(
        agent, "What city is the Golden Gate Bridge in?", session=session
    )
    print(result.final_output)  # "San Francisco"

    # Second turn - agent automatically remembers previous context
    result = await Runner.run(agent, "What state is it in?", session=session)
    print(result.final_output)  # "California"


if __name__ == "__main__":
    import asyncio

    asyncio.run(run_agent())
