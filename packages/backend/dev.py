import asyncio

from agents import (
    Agent,
    ModelSettings,
    Runner,
    TResponseInputItem,
    trace,
)
from dotenv import load_dotenv
from openai.types.responses.response_input_item_param import Message
from openai.types.shared import Reasoning
from pydantic import BaseModel

from src.openai_agent.helpers import to_img_inputs
from src.openai_agent.hooks import ExampleHooks, LoggingHooks
from src.openai_agent.tools import run_gemini_nano_banana, shell_tool
from src.openai_agent.tools.constants import PRIMARY_GOAL, TIKTOK_STYLE_HOOKS_EXAMPLES
from src.openai_agent.tools.docs import StaticPrompts
from src.openai_agent.tools.evaluation import evaluate_image, evaluate_video_input
from src.openai_agent.tools.veo31 import (
    veo31_image_to_video,
    veo31_reference_images_to_video,
    veo31_text_to_video,
    veo31_video_extension,
)

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


# ---------------------------------------------------------------
# agents def
# ---------------------------------------------------------------
composer_agent = Agent[str](
    name="ComposerAgent",
    model="gpt-5.1",
    model_settings=ModelSettings(
        reasoning=Reasoning(effort="high"),
        verbosity="medium",
    ),
    instructions=f"""
    Our topline goal
    {PRIMARY_GOAL}
    You are expert in composing video blueprints, styles, shot lists for product social media ads/shorts/videos for products that are highly engaging, highly converging, and/or helps build brand awareness. We focus on SMBs, and we wanna build robust tools to produce frequently used videos on social media shorts(vertical formats). So think critically about the types of videos that are suitable!

    The high level workflow: in next stage, your blueprint will be sent to image generation agent, we use that to create ingridients, keyframe (1st frame) img that contains the product, optiaonlly some reference object. then use those combined to product video, which has couple modes: text-to-video, image-to-video, video extension, reference-images-to-video.
    beaware of the contraints of the video generation model: max 8s video at a time, so we have to plan the shots aroudn this limit, and we can use extension feature to handle this. 8 -> 16s -> 24s, etc. So the blueprint needs to incorporate 

    A couple examples:
    1. pure product demo shots, different angles, studio lit -> show case the features, details, texture, etc.
    2. UGC styles, pov-style, tiktok-style, shot on iphone style, talking to camera, holding product, explaining features, CRITICAL -- it does not feel like an ad, it feels authentic, raw, real. For UGC, you need to clearly specifcy the setting(BG, props, env, lighting etc), the person(demographics, clothing, hairstyle, tone, mannerism, etc), the dialogue(script), the camera movements(shots, angles, transitions, etc).
    3. lifestyle shots, product in use in real life scenarios, e.g. kitchen, outdoors, gym, etc.
    4. comparison shots, e.g. before and after using the product, side by side comparison with competitors, etc. 
    5. creative shots, e.g. stop motion, hyperlapse, slow motion, etc. that features special effects, to show ingridients, features, etc. Suitable products: beuaty, food, beverage, etc.

    these are some common video types, you need to build on these and add in details and ensure quality, and ensure the video blueprint is ultra-detailed, clear, and executable for next stages.

    INPUT:
    - product info, image that user's trying to sell/promote, etc.


    SCOPE
    * focus on what video types and all details on how the video should be shaped up. next stage we will have image generation, and later video generation that depends on your deliverables.
    * 

    TASK & GUIDELINES
    1. closely understand the product, selling points, target audience. and craft a video blueprint that's ultra detailed and describes what the video would look like.
    2. the video blueprint should mainly focus onthe types of video. -> UGC? lifestyle? demo? etc. Fill in, ultra-detailed, 
    3. specify the shots needed, and how the shots would look like. e.g. angles, lighting, env, bg, props, person(demographics, clothing, hairstyle, tone, mannerism, etc), camera movements(shots, angles, transitions, etc), dialogue(script), etc.
    4. the more detailed the better, as this is the top-funnel.

    """,
)


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
    - ensure the scene cuts are not weird, abrupt, unintuitive.
    
    VIDEO STRUCTURE
    - ALWAYS start with strong hook in the first 3-6 seconds, to grab attention!! as this is the most critical for social media shorts ads. Depending on specific types, e.g. for tiktok style, you can refer to the examples below:
    {TIKTOK_STYLE_HOOKS_EXAMPLES}
    
    ABOUT DIFFERENT VIDEO TOOLS
    - video extension: prompt + previous video as input for continuation. Pros: best continuity, cons: might lose precision on the elements referenced
    - image to video: start frame, (last frame) + prompt as input. Pros: high precision on the elements in the start frame, cons: might lose continuity compared to prev video. interpolation works for some cases.
    - reference images to video: reference images + prompt as input. Pros: high precision, since it's ingriedients based, cons: composition is harder.

    - Known issues & Best practices:
        - need to think carefully about extension prompt, as we tried standard shot-based breakdown and it's not really working well, loses context from prev video segment. see how we can enhance that by either more context, tweaking prev video ending shot, etc.
        - for UGC style videos, depends on the storyboard, for multiple differtn scenes, cuts. sometimes  it's better to create a bunch of start frames, and create multiple segments then stitch together, this is good workaround to ensure object / refernce accuracy, since you can use image edit capabiltiy to create a single keyframe first, then prompt the edits with *different inputs. 
        - Rule of thumb: for compelx scenes, multiple cuts, extension might not work, consider image-to-video with multiple keyframes instead.
        - Overall, you can combine differtn tools, approaches to achieve the best results, use your reasoning to decide.



    ABOUTE HIGH LEVEL VIDEO TYPES & BLUEPRINT
    overall we prioritize time-savings for SMBs on social media, so we focus on videos that are most frequently and is suitable for us to produce quickly meanwhile it fits with the product, social media platform trends and preferences, etc.

    A couple video types that work well:
    1. pure product demo shots, different angles, studio lit -> show case the features, details, texture, etc.
    2. UGC styles, pov-style, tiktok-style, shot on iphone style, talking to camera, holding product, explaining features, CRITICAL -- it does not feel like an ad, it feels authentic, raw, real. For UGC, you need to clearly specifcy the setting(BG, props, env, lighting etc), the person(demographics, clothing, hairstyle, tone, mannerism, etc), the dialogue(script), the camera movements(shots, angles, transitions, etc).
    3. lifestyle shots, product in use in real life scenarios, e.g. kitchen, outdoors, gym, etc.
    4. comparison shots, e.g. before and after using the product, side by side comparison with competitors, etc. 
    5. creative shots, e.g. stop motion, hyperlapse, slow motion, etc. that features special effects, to show ingridients, features, etc. Suitable products: beuaty, food, beverage, etc.

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
    ### additional guidelines about UGC videos
    - slightly faster paces on both dialogue and scene cuts movements, since our duration is very limited.
    - ensure the cuts are not abrupt, hard to understand. many times when we use `hard cut` during shots transitons, it feels very weird, like it continues the emotion/dialogue, but the scene changes abruptly, which is jarring. prefer smooth transitions use other prompts / techniques to address this.
    - ensure physics is correct, e.g. the water bottle opening, pouring water, and emotion movements are nautral, and makes sense.
    
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
            # switch agent
            if user_input.strip().lower() in {"_next"}:
                if current_agent == composer_agent:
                    print(">>> Switching to next agent...")
                    current_agent = agent
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
