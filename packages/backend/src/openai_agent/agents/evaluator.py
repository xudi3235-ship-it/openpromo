import subprocess
from pathlib import Path
from typing import Literal

from agents import RunContextWrapper, function_tool
from openai.types.responses import ResponseInputContentParam

from src.core.shared import oai
from src.openai_agent.context import RuntimeContext
from src.openai_agent.helpers import to_img_inputs
from src.openai_agent.tools.constants import PRIMARY_GOAL, TIKTOK_STYLE_HOOKS_EXAMPLES
from src.openai_agent.tools.docs import StaticPrompts


@function_tool
async def evaluate_video_generation_input(
    wrapper: RunContextWrapper[RuntimeContext],
    current_state: str,
    video_tool_name: Literal[
        "text_to_video",
        "image_to_video",
        "video_extension",
        "reference_images_to_video",
    ],
    prompt: str,
    input_image_path: list[str] | None = None,
    input_video_path: str | None = None,
) -> str:
    """
    Evaluate video generation inputs before sending to veo3.1.

    Args:
        current_state: a brief summary of the videos, keyframes, etc. generated so far.
        video_tool_name: The veo3.1 tool being used (text_to_video, image_to_video, video_extension, reference_images_to_video)
        prompt: The veo3.1 prompt to evaluate
        input_image_path: List of paths to input images (for image_to_video, reference_images_to_video)
        input_video_path: Path to input video (for video_extension)

    Returns:
        Evaluation feedback as a string
    """
    evaluation_prompt = f"""
    You are an expert video production evaluator specializing in social media content.
    
    PRIMARY GOAL
    {PRIMARY_GOAL}

    Current State:
    {current_state}
    
    ROLE
    Your task is to evaluate video generation inputs (prompts, images, settings) BEFORE they're sent to veo3.1. Your goal is to catch issues early, ensure quality, optimize for social media shorts (TikTok, IG Reels, FB Reels), and VALIDATE THE RIGHT TOOL IS BEING USED. ONLY GIVE feedback on *what could be improved*, DO NOT rewrite the prompt yourself.
    
    CRITICAL: VEO3.1 CONSTRAINTS
    - **8 SECOND MAX per video generation** - This is non-negotiable! Longer videos MUST use extension or stitching.
    - Target platform: TikTok, IG Reels, FB Reels (15-30s total duration)
    - Aspect ratio: 9:16 (vertical) for social media shorts
    - **Text overlays are NOT accurate yet** - avoid prompts requesting text/captions

    
    TOOL SELECTION VALIDATION (CRITICAL)
    Verify the correct veo3.1 tool is being used for this use case:
    
    1. **text_to_video**: Pure text-to-video, NO image inputs
       - Use when: Starting from scratch with no visual references
       - Pros: Full creative control via prompt
       - Cons: Less precision on specific objects/products
       - Requires: ULTRA-detailed prompt (camera, lighting, movement, setting, etc.)
    
    2. **image_to_video**: Start frame (+ optional end frame for interpolation)
       - Use when: High precision needed on start frame elements
       - Pros: Excellent object/product accuracy from start frame
       - Cons: May lose continuity if extending from previous video
       - Best for: Product demos, specific object focus, keyframe-based scenes
    
    3. **video_extension**: Previous veo3.1 video + prompt for continuation
       - Use when: Extending existing veo3.1 video beyond 8s
       - Pros: Best visual/narrative/audio continuity
       - Cons: May lose precision on referenced elements vs. image_to_video
       - CRITICAL: Extension prompt must ensure seamless continuation (character consistency, visual flow, audio transitions)
    
    4. **reference_images_to_video**: Reference "ingredient" images + prompt
       - Use when: Need high precision on multiple reference objects
       - Pros: Ingredient-based, high accuracy on referenced elements
       - Cons: Harder composition, requires 16:9 aspect ratio images
       - Best for: Product feature showcases, object-centric scenes
    
    COMMON PITFALLS & WORKAROUNDS (CHECK THESE!)
    
    PITFALL 1: Video Extension Context Loss
    - Problem: Standard shot-based breakdown loses context from previous video
    - Symptoms: Inconsistent character appearance, jarring transitions, audio mismatch
    - Workarounds:
      * Add more context in extension prompt (reference previous ending explicitly)
      * Tweak previous video's ending to better set up the next segment
      * For complex scene changes, consider image_to_video with new keyframes instead
    
    PITFALL 2: Extension Limits for Complex Scenes
    - Problem: Multiple different scenes/cuts don't work well with extension
    - Symptoms: Abrupt cuts, inconsistent lighting, weird transitions
    - Rule of thumb: For complex scenes with multiple cuts, extension might not work
    - Workarounds:
      * Use image_to_video with multiple keyframes instead of extension
      * Create separate video segments and stitch with ffmpeg
      * For UGC style: Generate multiple start frames → create segments → stitch
    
    PITFALL 3: Reference Object/Product Accuracy
    - Problem: text_to_video and extension may distort products/logos
    - Symptoms: Distorted logos, wrong colors, incorrect product details
    - Workarounds:
      * Use image_to_video with product image as start frame
      * Use reference_images_to_video with 16:9 product images
      * Add <negative_prompt> section to avoid distortions
    
    PITFALL 4: Abrupt Scene Cuts
    - Problem: "Hard cut" transitions feel jarring in continuous dialogue
    - Symptoms: Emotion/dialogue continues but scene changes abruptly
    - Workarounds:
      * Use smooth transition prompts (fade, dissolve, pan, etc.)
      * Separate dialogue/emotion beats from scene changes
      * For UGC: Match scene change timing with dialogue pauses
    
    PITFALL 5: Physics & Realism Issues
    - Problem: Floating objects, unnatural movements, weird physics
    - Symptoms: Products defying gravity, distorted motion, unrealistic interactions
    - Workarounds:
      * Use <negative_prompt> section (e.g., "floating objects, distorted logos")
      * Be explicit about physical constraints in prompt
      * For product demos: Use image_to_video with real product photo
    
    PITFALL 6: Weak Hook (First 3-6 seconds)
    - Problem: Slow start, no attention grab for social media
    - Symptoms: Boring opening, generic intro, no immediate value
    - Workarounds:
      * Start with strong visual hook (close-up, action, surprise)
      * Use dialogue hook (question, bold claim, problem statement)
      * Reference TikTok style hooks: {TIKTOK_STYLE_HOOKS_EXAMPLES}
    
    EVALUATION CRITERIA
    
    1. TOOL SELECTION (MOST CRITICAL)
       - Is the correct veo3.1 tool being used for this use case?
       - Would a different tool achieve better results?
       - Are tool-specific requirements met (e.g., 16:9 for reference_images)?
    
    2. PROMPT CLARITY & SPECIFICITY
       - Is the prompt clear and specific enough for the model to execute?
       - Are there ambiguous descriptions that could lead to inconsistent outputs?
       - Does it include necessary details (camera work, lighting, movement, setting)?
       - For UGC: Are person demographics, setting, dialogue script specified?
       - Is the prompt front-loaded with important details (veo3.1 weights early words more)?
    
    3. DURATION & PACING FEASIBILITY
       - Does the prompt fit within 8s max per generation?
       - If longer video needed, is extension/stitching strategy clear?
       - Is pacing appropriate for social media shorts (slightly faster)?
       - Can the described action fit within the time constraint?
    
    4. IMAGE INPUT VALIDATION (if applicable)
       - Are image inputs high quality and relevant?
       - Do they match the prompt description?
       - For reference_images_to_video: Are images 16:9 aspect ratio?
       - For image_to_video: Does the start frame align with the prompt?
       - For products: Is product image used as input for accuracy?
    
    5. CONTINUITY & TRANSITIONS
       - For extension: Does prompt ensure seamless continuation?
       - Are scene cuts intuitive, not abrupt?
       - Do transitions match dialogue/emotion flow?
       - Is audio continuity maintained?
       - Are character/object consistency explicitly addressed?
    
    6. HOOK & ENGAGEMENT (Critical for social media)
       - Does the prompt include a strong opening hook (first 3-6 seconds)?
       - Will it grab attention immediately and stop scrolls?
       - Is there a clear story arc or value proposition?
       - Does it follow proven patterns (contradiction, specificity, POV, etc.)?
    
    7. TECHNICAL SPECIFICITY & REALISM
       - Are camera movements clearly described with film terminology?
       - Are lighting and visual effects specific enough?
       - Does the prompt avoid physics issues?
       - Are dialogue and speech sync realistic?
       - Is color grading or visual tone described?
    
    8. NEGATIVE PROMPTS & AVOIDANCE
       - Are known issues explicitly avoided via <negative_prompt>?
       - Examples: distorted logos, floating objects, text overlays, etc.
    
    TOOL-SPECIFIC GUIDANCE FOR THIS REQUEST
    - {video_tool_name}: {_get_tool_specific_guidance(video_tool_name)}
    
    EVALUATION OUTPUT FORMAT
    
    **OVERALL ASSESSMENT**: [APPROVED / NEEDS REVISION / REJECTED]
    
    **TOOL VALIDATION**:
    - Is the correct tool being used? If not, which tool should be used instead?
    
    **STRENGTHS**:
    - List 2-3 things that are well done
    
    **CRITICAL ISSUES** (if any):
    - List specific, actionable problems that MUST be fixed
    
    **COMMON PITFALLS DETECTED** (if any):
    - Reference specific pitfalls from the list above
    
    **RECOMMENDATIONS**:
    - 2-3 specific improvements to enhance quality/clarity
    
    **WORKAROUNDS** (if pitfalls detected):
    - Suggest specific workarounds from the pitfall list
    
    **REVISION SUGGESTIONS** (if NEEDS REVISION):
    - Provide rewritten sections or specific edits needed
    
    APPROVAL CRITERIA
    - APPROVED: Prompt is clear, specific, feasible, right tool selected, likely to produce high-quality output
    - NEEDS REVISION: Prompt has fixable issues; recommend specific improvements
    - REJECTED: Wrong tool selected OR fundamental issues that make execution risky; recommend complete rethinking
    
    REFERENCE MATERIALS
    ### veo3.1 Best Practices
    {StaticPrompts.good_veo31_prompt_examples()}
    
    ### veo3.1 Detailed Guide
    {StaticPrompts.veo31_from_url()}
    
    ### General Prompt Guide
    {StaticPrompts.general_image_prompt_guide()}
    
    Be direct, specific, and actionable in your feedback. Your goal is to prevent wasted API calls, ensure the RIGHT TOOL is used, and ensure outputs meet quality standards for social media shorts.
    """

    user_content: list[ResponseInputContentParam] = [
        {
            "type": "input_text",
            "text": f"Runtime Context: {wrapper.context.model_dump_json()}",
        },
        {
            "type": "input_text",
            "text": f"Video Tool: {video_tool_name}\n\nPrompt to evaluate:\n{prompt}",
        },
    ]

    # Add images if provided
    if input_image_path:
        user_content.extend(to_img_inputs(input_image_path))

    # Extract first and last frames from video if provided
    if input_video_path:
        frame_paths = _extract_video_frames(input_video_path)
        if not frame_paths:
            return f"Error: Unable to extract frames from the provided video. args: {input_video_path}"
        user_content.extend(to_img_inputs(frame_paths))
        user_content.append(
            {
                "type": "input_text",
                "text": f"Input video path: {input_video_path} (first and last frames extracted above)",
            }
        )

    resp = oai().responses.create(
        model="gpt-5.1",
        reasoning={"effort": "medium"},
        input=[
            {
                "role": "system",
                "content": evaluation_prompt,
            },
            {
                "role": "user",
                "content": user_content,
            },
        ],
    )

    feedback = resp.output_text
    print(f"Video generation input evaluation feedback:\n{feedback}")
    return feedback


def _get_tool_specific_guidance(tool_name: str) -> str:
    """Get tool-specific evaluation guidance."""
    guidance_map = {
        "text_to_video": "Pure text-to-video: Ensure all visual details are explicitly described. No reliance on images. Must be extremely detailed about camera work, lighting, and movement.",
        "image_to_video": "Image-to-video: Input image must be high quality and match the prompt. Ensure continuity between static image and described motion. Watch for physics inconsistencies.",
        "video_extension": "Video extension: Prompt must ensure seamless continuation from previous video. Focus on maintaining character consistency, visual continuity, and avoiding jarring cuts. Audio must flow naturally.",
        "reference_images_to_video": "Reference images to video: Input images must be 16:9 aspect ratio. These are 'ingredients' - use specific language about how elements should appear. Precise object placement and styling is critical.",
    }
    return guidance_map.get(tool_name, "")


def _extract_video_frames(video_path: str) -> list[str] | None:
    """
    Extract first and last frames from a video file using ffmpeg.

    Args:
        video_path: Path to the video file

    Returns:
        List of paths to extracted frame images, or None if extraction fails
    """
    try:
        video_path_obj = Path(video_path)
        if not video_path_obj.exists():
            print(f"Video file not found: {video_path}")
            return None

        # Create tmp directory if it doesn't exist
        tmp_dir = Path("./tmp/evaluation_frames")
        tmp_dir.mkdir(parents=True, exist_ok=True)

        video_stem = video_path_obj.stem
        first_frame_path = tmp_dir / f"{video_stem}_frame_first.jpg"
        last_frame_path = tmp_dir / f"{video_stem}_frame_last.jpg"

        # Extract first frame (at 0 seconds)
        cmd_first = [
            "ffmpeg",
            "-i",
            video_path,
            "-vf",
            "select=eq(n\\,0)",
            "-q:v",
            "2",
            "-y",
            str(first_frame_path),
        ]

        result = subprocess.run(cmd_first, capture_output=True, text=True)
        if result.returncode != 0:
            print(f"Failed to extract first frame: {result.stderr}")
            return None

        # Get video duration to extract last frame
        cmd_duration = [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=noprint_wrappers=1:nokey=1:novalue=1",
            video_path,
        ]

        result = subprocess.run(cmd_duration, capture_output=True, text=True)
        if result.returncode != 0:
            print(f"Failed to get video duration: {result.stderr}")
            # Fall back to just returning the first frame
            return [str(first_frame_path)]

        try:
            duration = float(result.stdout.strip())
        except ValueError:
            print("Could not parse video duration")
            return [str(first_frame_path)]

        # Extract last frame (at duration - 0.1 seconds)
        last_frame_time = max(0, duration - 0.1)
        cmd_last = [
            "ffmpeg",
            "-i",
            video_path,
            "-ss",
            str(last_frame_time),
            "-vf",
            "select=eq(n\\,0)",
            "-q:v",
            "2",
            "-y",
            str(last_frame_path),
        ]

        result = subprocess.run(cmd_last, capture_output=True, text=True)
        if result.returncode != 0:
            print(f"Failed to extract last frame: {result.stderr}")
            # Return just the first frame if last frame extraction fails
            return [str(first_frame_path)]

        return [str(first_frame_path), str(last_frame_path)]

    except Exception as e:
        print(f"Error extracting video frames: {e}")
        return None
