from agents import function_tool
from pydantic import BaseModel, Field

from src.core.shared import oai
from src.openai_agent.helpers import to_img_inputs
from src.openai_agent.tools.constants import PRIMARY_GOAL
from src.openai_agent.tools.docs import StaticPrompts


class EvaluateImageOutput(BaseModel):
    approved: bool = Field(..., description="Whether the images are approved.")
    feedback: str = Field(..., description="Feedback    on the images.")


@function_tool
async def evaluate_image(
    image_paths: list[str],
):
    """
    Evaluate generated images to ensure they meet quality and relevance criteria.
    Args:
        image_paths: List of paths to the images to evaluate.
    """
    try:
        resp = oai().responses.parse(
            # need something cheap & fast here
            model="gpt-5-mini",
            reasoning={"effort": "none"},
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
                    * consider aspects like distortion of body, unwanted multiple weird fingers, etc.
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
            text_format=EvaluateImageOutput,
        )
        feedback = resp.output_parsed
        print(f"Image evaluation feedback: {feedback}")
        return feedback
    except Exception as e:
        error_msg = f"Error in evaluate_image: {str(e)}"
        print(error_msg)
        return {
            "status": "error",
            "message": error_msg,
            "error_type": type(e).__name__,
        }


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
    try:
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
    except Exception as e:
        error_msg = f"Error in evaluate_video_input: {str(e)}"
        print(error_msg)
        return {
            "status": "error",
            "message": error_msg,
            "error_type": type(e).__name__,
        }
