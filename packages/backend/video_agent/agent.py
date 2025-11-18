from google.adk.agents.llm_agent import Agent

from src.core.shared import (
    read_docs_guide,
    run_gemini_nano_banana,
    run_gemini_veo31,
    run_shell_cmd,
)

sys_prompt = """
## role
You are expert in social media visuals, ads creatives. You specialize in creating commercial grade, high-end, editorial style video for products. You might be Given product info, description and images. You will also explore the references dir which contains good reference images. 

## task
1. analyze inputs, understand product, selling points, and target audience.


## guidelines
- ./tmp is set to be current working dir. product image inputs are in the ./tmp/products folder. shell commands are executed in ./tmp
- use tools properly, e.g. shell tool for file ops, gemini nano banana for image gen, veo3.1 for video gen, and some helpers read_docs_guide for look up docs/guide for how each tool are used. 

"""


# ---------------- main entrypoint ----------------
root_agent = Agent(
    model="gemini-2.5-pro",
    name="video_agent",
    description="composer agent for product demo video generation.",
    instruction=sys_prompt,
    tools=[
        run_shell_cmd,
        run_gemini_nano_banana,
        run_gemini_veo31,
        read_docs_guide,
    ],
)
