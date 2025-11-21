import asyncio
from dataclasses import dataclass

from agents import (
    Agent,
    ModelSettings,
    Runner,
    TResponseInputItem,
    function_tool,
    trace,
)
from dotenv import load_dotenv
from openai.types.responses.response_input_item_param import Message
from openai.types.shared import Reasoning

from src.core.shared import oai
from src.openai_agent.helpers import to_img_inputs
from src.openai_agent.hooks import ExampleHooks, LoggingHooks
from src.openai_agent.tools import run_gemini_nano_banana, shell_tool
from src.openai_agent.tools.docs import StaticPrompts
from src.openai_agent.tools.veo31 import (
    veo31_image_to_video,
    veo31_reference_images_to_video,
    veo31_text_to_video,
    veo31_video_extension,
)

load_dotenv()

"""
Nov 18, 2025.

sub-agent system for video generation pipeline.

Step 0. find good pinterest ref images related.
Step 1. use the tools, create, modify, generate images
Step 2. sanity check on those images, if not good, back to step 1
Step 3. generate video using veo3.1 fast.
"""


@dataclass
class AppContext:
    # add context here to this data class
    pass


def create_user_input() -> Message:
    user_msg = """here's the product.
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


PRIMARY_GOAL = """
You specialize in creating product social media ads/shorts/videos for products that are highly engaging, highly converging, and/or helps build brand awareness. You might be Given product info, description and images. You will also use the references dir which contains good reference images as grouding to create assets and videos. We target SMBs(small businesses) ONLY.
"""


@function_tool
async def evaluate_image(
    image_paths: list[str],
):
    """
    Evaluate generated images to ensure they meet quality and relevance criteria.
    Args:
        image_paths: List of paths to the images to evaluate.
    """
    resp = oai().responses.create(
        model="gpt-5.1",
        reasoning={"effort": "medium"},
        input=[
            {
                "role": "system",
                "content": f"""
                ROLE & GOAL
                You are expert in evaluating images generated from product + reference images, that will be later used for video generation flow.
                Given the primary goal of the agent who produced these imgs: {PRIMARY_GOAL}
                and the primary target is SMBS(small businesses) who need quick, high-quality, engaging social media shorts/ads/videos for their products on social media(tiktok, ig reels, fb reels, etc).

                SCOPE
                * Focus on: analyzing the generated images, understanding product, selling points, and target audience.
                * Evaluate how well the images align with the product, reference images, and overall goal.
                * consider aspects like visual appeal, clarity of product representation, creativity, and suitability for social media platforms.
                * if good enough, then approve with a single sentence, else Provide constructive feedback *ONLY what could be improved to better meet the primary in concise 2-sentence acitonable terms.
                """,
            },
            {
                "role": "user",
                "content": [
                    *to_img_inputs(image_paths),
                ],
            },
        ],
    )
    feedback = resp.output_text
    print(f"Image evaluation feedback: {feedback}")
    return feedback


@function_tool
async def evaluate_video_input(
    image_paths: list[str],
    prompt: str,
):
    """
    Evaluate inputs for veo3.1 generation, including images, prompt
    Args:
        image_paths: veo3.1 image input, if any.
        prompt: The veo3.1 prompt to evaluate.
    """
    print(f"Evaluating veo3.1 inputs, prompt: {prompt}, images: {image_paths}")

    resp = oai().responses.create(
        model="gpt-5.1",
        reasoning={"effort": "medium"},
        input=[
            {
                "role": "system",
                "content": f"""
                ROLE & GOAL
                You are expert inputs for veo3.1 video generation for SMBs, including image and video prompts.

                Given the primary goal of the agent who produced these imgs: {PRIMARY_GOAL}
                and the primary target is SMBS(small businesses) who need quick, high-quality, engaging social media shorts/ads/videos for their products on social media(tiktok, ig reels, fb reels, etc).

                SCOPE
                * Focus on: the camera movements, the shot, storyboard, if they make sense, and what can be improved, also dialogue, audio, etc, pretty much everything, to ensure the quality!
                * Evaluate how well the images align with the product, reference images, and overall goal.
                * if good enough, then approve with a single sentence, else Provide constructive feedback *ONLY what could be improved to better meet the primary in concise 2-3 sentence acitonable terms.

                REFERENCES
                ### veo3.1 guide
                {StaticPrompts.veo31_from_url()}
                ### GOOD veo3.1 prompt examples
                {StaticPrompts.good_veo31_prompt_examples()}
                """,
            },
            {
                "role": "user",
                "content": [
                    {
                        "type": "input_text",
                        "text": f"Here is the veo3.1 prompt to evaluate:\n{prompt}, and here are the images input.",
                    },
                    *to_img_inputs(image_paths),
                ],
            },
        ],
    )
    feedback = resp.output_text
    print(f"Image evaluation feedback: {feedback}")
    return feedback


async def run_agent():
    sys_prompt = f"""
    You are expert in social media visuals, ads creatives. 
    PRIMARY GOAL
    {PRIMARY_GOAL}
    SCOPE
    * Focus on: exploring connection between product, reference image, and ideas from the docs/guide, good examples to craft good product-centric images, and later use those create videos, suited for fast paced social media shorts, duration 15-30s, target platform is Tiktok, IG reels, and FB reels. Styles can be varied, overall goal is to quick create engaging, high-quality shots so that SMBs can directly post it.
    AUTONOMY & PLANNING
    * use shell tool, we should store things inside ./tmp dir. product image inputs are in the ./tmp/products folder. ensure you only run shell commands in ./tmp, all paths need to include ./tmp as prefix.
    * nano_banana is used for image generation. it can take image inputs with great accuracy, details, follow docs/guide.
    * veo3.1 is used for video generation. We have specific tools for different modes:
      - `veo31_text_to_video`: for pure text-to-video generation.
      - `veo31_image_to_video`: for image-to-video generation (start frame), optionally with end frame for interpolation.
      - `veo31_video_extension`: for extending an existing veo3.1 video.
      - `veo31_reference_images_to_video`: for using reference assets ("ingredients") to generate video.

    ABOUT IMAGE GENERATION
    - when generating images, ALWAYS use the product image as input to ensure product is clearly visible.
    - feel free to generate a couple different images with differnt prompts, if they are part of the complex shots needed for longer video. 
    - image prompt needs to be ultra-detailed, this is critical.

    ABOUT VIDEO GENERATION
    - veo3.1 can only create up to 8s video at a time!! this is critical, so this means the image generation, storyboard, eveyrhting need to be planned around this constraint. Longer videos can be achieved by extending prev one, or creating mutliple videos, use your reasoning and specific use cases to decide best approach.
    - camera movements, transitions be smooth, creative, and authentic.
    - **FOR NOW, don't add texts, it's not accurate enough yet.
    - stiching videos is less preferred compared to extension, however it might be suitable for some cases. in that case, generate different videos with veo3.1, then use shell tool to stich with ffmpeg.
    - when extending video, it's critical to ensure continuity, this applies to both visual, narrative flow, and audio! think carefully when crafting the extension prompt.
    - when creating veo3.1 prompt, you can add a <negative_prompt> section to explicity state what to avoid in the video. this is useful to avoid unwanted artifacts, issues. E.g. distorted logos, weird physics, etc.
    - for reference object accuracy, ingridients, use `veo31_reference_images_to_video` with reference images as input. Note that this tool requires 16:9 aspect ratio.

    TASKS
    - analyze inputs, understand product, selling points, and target audience.
    - pick the best fitting image reference, and *preferrably use the reference + product image as input to craft a image(nano banana) following the docs guide. ALWAYS use product image as input when creating image. This will be key start frame for the product demo video.
    - evaluate the generated images using the evaluate_image tool to ensure they meet quality and relevance criteria, and make adjustments, depends on feedback you can either regenerate, or use image input to `edit` the previously generated image to fix issues with small tweaks. ONLY NEED TO RUN THIS ONCE!!
    - create a good veo3.1 prompt with the new image to create product demo video. you can specify multiple shots follwing the veo3.1 guide in a single video gen.
    - before running veo3.1, use the evaluate_video_input tool to ensure the inputs are good enough, if not, make adjustments based on the feedback.
    - choose the correct veo3.1 tool based on your need (text-to-video, image-to-video, extension, or reference-images).
    - our goal is social media video shorts, overall duration is 15-30s, so roughly you can use the extension feature to extend it, with new prompts, variety, etc.


    <final_answer_formatting>
    You value clarity, momentum, and respect measured by usefulness rather than pleasantries.
    - When stakes are high (deadlines, compliance issues, urgent logistics), you drop even that small nod and move straight into solving or collecting the necessary information.
    - Core inclination:
    - You speak with grounded directness. You trust that the most respectful thing you can offer is efficiency: solving the problem cleanly without excess chatter.
    - You never repeat acknowledgments. Once you've signaled understanding, you pivot fully to the task.
    </final_answer_formatting>


    ## additional resources
    ### general prompt guide for image gen
    {StaticPrompts.general_image_prompt_guide()}
    ### nano banana guide
    {StaticPrompts.nano_banana_prompt_guide_from_url()}
    ### veo3.1 guide
    {StaticPrompts.veo31_from_url()}
    ### good veo3.1 prompt examples
    {StaticPrompts.good_veo31_prompt_examples}
    ### good nano banana prompt examples
    {StaticPrompts.good_nano_banana_prompt_examples}
    """
    agent = Agent[str](
        name="Agent",
        model="gpt-5.1",
        model_settings=ModelSettings(
            reasoning=Reasoning(effort="high"),
            verbosity="medium",
        ),
        instructions=sys_prompt,
        # output_type=VideoSpec,
        hooks=LoggingHooks(),
        tools=[
            shell_tool,
            evaluate_image,
            evaluate_video_input,
            run_gemini_nano_banana,
            veo31_text_to_video,
            veo31_image_to_video,
            veo31_video_extension,
            veo31_reference_images_to_video,
        ],
    )
    init_input: list[TResponseInputItem] = [
        create_user_input(),
    ]
    with trace("Video Generation workflow"):
        current_agent = agent
        current_input_items: list[TResponseInputItem] = init_input
        while True:
            try:
                user_input = input(" > ")
            except (EOFError, KeyboardInterrupt):
                print()
                break
            if user_input.strip().lower() in {"exit", "quit"}:
                break
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
