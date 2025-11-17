import asyncio
import base64
import os
import shutil
from pathlib import Path
from typing import Any, Literal, Optional, TypedDict, cast

from agents import (
    Agent,
    AgentHooks,
    ModelResponse,
    RunContextWrapper,
    RunHooks,
    Runner,
    ShellCallOutcome,
    ShellCommandOutput,
    ShellCommandRequest,
    ShellResult,
    ShellTool,
    Tool,
    TResponseInputItem,
    Usage,
    function_tool,
    trace,
)
from agents.tool_context import ToolContext
from dotenv import load_dotenv
from openai.types import VideoSize
from openai.types.responses import ResponseInputImageParam, ResponseInputItemParam
from pydantic import BaseModel, Field
from scenedetect.scene_manager import SceneList

from src.core.shared import oai, run_gemini_nano_banana

load_dotenv()


def resize_image(image_path: str, output_path: str, new_size: tuple[int, int]) -> None:
    from PIL import Image

    with Image.open(image_path) as img:
        resized_img = img.resize(new_size, Image.Resampling.LANCZOS)
        resized_img.save(output_path)


class LoggingHooks(AgentHooks[Any]):
    async def on_start(
        self,
        context: RunContextWrapper[Any],
        agent: Agent[Any],
    ) -> None:
        print(f"#### {agent.name} is starting.")

    async def on_end(
        self,
        context: RunContextWrapper[Any],
        agent: Agent[Any],
        output: Any,
    ) -> None:
        print(f"#### {agent.name} produced output: {output}.")


class ExampleHooks(RunHooks):
    def __init__(self):
        self.event_counter = 0

    def _usage_to_str(self, usage: Usage) -> str:
        return f"{usage.requests} requests, {usage.input_tokens} input tokens, {usage.output_tokens} output tokens, {usage.total_tokens} total tokens"

    async def on_agent_start(self, context: RunContextWrapper, agent: Agent) -> None:
        self.event_counter += 1
        print(
            f"### {self.event_counter}: Agent {agent.name} started. Usage: {self._usage_to_str(context.usage)}"
        )

    async def on_llm_start(
        self,
        context: RunContextWrapper,
        agent: Agent,
        system_prompt: Optional[str],
        input_items: list[TResponseInputItem],
    ) -> None:
        self.event_counter += 1
        print(
            f"### {self.event_counter}: LLM started. Usage: {self._usage_to_str(context.usage)}"
        )

    async def on_llm_end(
        self, context: RunContextWrapper, agent: Agent, response: ModelResponse
    ) -> None:
        self.event_counter += 1
        print(
            f"### {self.event_counter}: LLM ended. Usage: {self._usage_to_str(context.usage)}"
        )

    async def on_agent_end(
        self, context: RunContextWrapper, agent: Agent, output: Any
    ) -> None:
        self.event_counter += 1
        print(
            f"### {self.event_counter}: Agent {agent.name} ended with output {output}. Usage: {self._usage_to_str(context.usage)}"
        )

    # Note: The on_tool_start and on_tool_end hooks apply only to local tools.
    # They do not include hosted tools that run on the OpenAI server side,
    # such as WebSearchTool, FileSearchTool, CodeInterpreterTool, HostedMCPTool,
    # or other built-in hosted tools.
    async def on_tool_start(
        self, context: RunContextWrapper, agent: Agent, tool: Tool
    ) -> None:
        self.event_counter += 1
        # While this type cast is not ideal,
        # we don't plan to change the context arg type in the near future for backwards compatibility.
        tool_context = cast(ToolContext[Any], context)
        print(f"### {self.event_counter}: Tool {tool.name} started.")

    async def on_tool_end(
        self, context: RunContextWrapper, agent: Agent, tool: Tool, result: str
    ) -> None:
        self.event_counter += 1
        # While this type cast is not ideal,
        # we don't plan to change the context arg type in the near future for backwards compatibility.
        tool_context = cast(ToolContext[Any], context)
        print(f"### {self.event_counter}: Tool {tool.name} finished. result={result}.")

    async def on_handoff(
        self, context: RunContextWrapper, from_agent: Agent, to_agent: Agent
    ) -> None:
        self.event_counter += 1
        print(
            f"### {self.event_counter}: Handoff from {from_agent.name} to {to_agent.name}. Usage: {self._usage_to_str(context.usage)}"
        )


hooks = ExampleHooks()


class ShellExecutor:
    """Executes shell commands with optional approval."""

    def __init__(self, cwd: Path | None = None):
        self.cwd = Path(cwd or Path.cwd())

    async def __call__(self, request: ShellCommandRequest) -> ShellResult:
        action = request.data.action

        outputs: list[ShellCommandOutput] = []
        for command in action.commands:
            proc = await asyncio.create_subprocess_shell(
                command,
                cwd=self.cwd,
                env=os.environ.copy(),
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            timed_out = False
            try:
                timeout = (action.timeout_ms or 0) / 1000 or None
                stdout_bytes, stderr_bytes = await asyncio.wait_for(
                    proc.communicate(), timeout=timeout
                )
            except asyncio.TimeoutError:
                proc.kill()
                stdout_bytes, stderr_bytes = await proc.communicate()
                timed_out = True

            stdout = stdout_bytes.decode("utf-8", errors="ignore")
            stderr = stderr_bytes.decode("utf-8", errors="ignore")
            outputs.append(
                ShellCommandOutput(
                    command=command,
                    stdout=stdout,
                    stderr=stderr,
                    outcome=ShellCallOutcome(
                        type="timeout" if timed_out else "exit",
                        exit_code=getattr(proc, "returncode", None),
                    ),
                )
            )

            if timed_out:
                break

        return ShellResult(
            output=outputs,
            provider_data={"working_directory": str(self.cwd)},
        )


shell_tool = ShellTool(
    executor=ShellExecutor(),  # Use LocalShell() to disable execution
)


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


def detect_scenes(video_path: str):
    """
    detect scenes from a video file, detects by content changes
    using opencv, useful for splitting shots
    """
    from scenedetect import ContentDetector, detect

    return detect(video_path, ContentDetector())


def extract_keyframes(video_path: str):
    scene_list: SceneList = detect_scenes(video_path)
    output_dir = "./tmp/extracted_frames"
    shutil.rmtree(output_dir, ignore_errors=True)
    os.makedirs(output_dir, exist_ok=True)  # noqa: F821

    shots: list[RawShotSpec] = []

    for i, (start_timecode, end_timecode) in enumerate(scene_list):
        start_seconds = start_timecode.get_seconds()
        end_seconds = end_timecode.get_seconds()

        # Extract frame at the beginning of the scene
        start_frame_cmd = f"ffmpeg -i {video_path} -ss {start_seconds} -vframes 1 {output_dir}/scene_{i}_start.jpg"
        os.system(start_frame_cmd)
        print(
            f"Extracted frames for scene {i}: start ({start_seconds}s) and end ({end_seconds}s)."
        )
        shots.append(
            RawShotSpec(
                start_time=start_seconds,
                end_time=end_seconds,
                description="",
                start_frame_image_path=f"{output_dir}/scene_{i}_start.jpg",
            )
        )
    return shots


# ------------------------------------------------------------------
# specs
# ------------------------------------------------------------------
class RawShotSpec(BaseModel):
    start_time: float = Field(..., description="Start time of the shot in seconds")
    end_time: float = Field(..., description="End time of the shot in seconds")
    description: str = Field(
        ...,
        description="Description of the shot content. include specific camera controls, angles, movements, etc.",
    )
    start_frame_image_path: str = Field(
        ..., description="Path to the start frame image of the shot"
    )

    def to_response_input_image_param(self) -> ResponseInputImageParam:
        with open(self.start_frame_image_path, "rb") as img_file:
            img_bytes = img_file.read()
        base64_image = base64.b64encode(img_bytes).decode("utf-8")
        return {
            "type": "input_image",
            "image_url": f"data:image/jpeg;base64,{base64_image}",
            "detail": "auto",
        }


class NewShotSpec(BaseModel):
    id: int = Field(..., description="sequence id of the new shot, e.g. 1, 2, 3")
    duration: Literal["4", "8", "12"] = Field(
        ..., description="Duration of the shot in seconds. Valid values: 4, 8, or 12"
    )
    video_prompt: str = Field(..., description="Prompt for this shot")
    video_size: VideoSize = Field(..., description="Resolution of the generated video")
    video_start_frame_image_path: str = Field(
        ..., description="Path to the start frame image for this new shot"
    )

    def resize_img(self) -> None:
        # read the current size from video_size, parse "{width}x{height}"
        size_str = self.video_size
        width_str, height_str = size_str.split("x")
        width = int(width_str)
        height = int(height_str)
        output_path = self.video_start_frame_image_path.replace(
            ".jpg", f"_resized_{size_str}.jpg"
        )
        resize_image(
            self.video_start_frame_image_path,
            output_path,
            (width, height),
        )


class VideoSpec(BaseModel):
    title: str = Field(..., description="Title of the video")
    description: str = Field(..., description="Description of the video content")
    video_context: str = Field(
        ...,
        description="Overall context or theme of the video, helps to guide shot creation, overall themeing, etc.",
    )
    raw_shots: list[RawShotSpec] = Field(
        ..., description="List of raw shots in the input reference video"
    )
    new_shots: list[NewShotSpec] = Field(
        ...,
        description="List of new shots generated for the output video will be fed to sora2 video generation",
    )

    def serialize(self) -> str:
        # serialzie all fields
        return self.model_dump_json(indent=2)

    def to_response_input_items(self) -> list[ResponseInputItemParam]:
        items: list[ResponseInputItemParam] = []
        items.append(
            {
                "role": "user",
                "content": [
                    {
                        "type": "input_text",
                        "text": f"here is the serialized video spec: {self.serialize()}. Here are all the shots keyframes from the video.",
                    },
                    *[shot.to_response_input_image_param() for shot in self.raw_shots],
                ],
            }
        )
        return items


def read_from_path(path: str) -> str:
    with open(path, "r") as f:
        return f.read()


class VideoGenInput(TypedDict):
    shot: NewShotSpec


class ImageGenInput(TypedDict):
    prompt: str
    input_image_paths: list[str]


class ImageGenOutput(TypedDict):
    error: str | None
    generated_image_urls: list[str]


@function_tool
async def gen_video_sora2(input: VideoGenInput):
    """
    generate video using sora2 given video spec
    """
    shot = input["shot"]
    shot.resize_img()
    # rezi
    video = oai().videos.create(
        prompt=shot.video_prompt,
        seconds=shot.duration,
        input_reference=Path(shot.video_start_frame_image_path),
    )
    print(f"created sora2 video.id: {video.id}")
    while not video.status == "completed":
        await asyncio.sleep(10)
        video = oai().videos.retrieve(video.id)
        print(f"Video status: {video.status}")
    # done, download
    res = oai().videos.download_content(video.id)
    fout = "./tmp/sora2_generated_video.mp4"
    with open(fout, "wb") as f:
        f.write(res.read())
    print(f"Downloaded generated video to {fout}")
    return fout


@function_tool(
    description_override="generate image, nano banana using prompt + image paths. "
)
async def nano_banana_image_gen(input: ImageGenInput):
    if not input["prompt"]:
        return ImageGenOutput(
            error="prompt is required",
            generated_image_urls=[],
        )

    for path in input["input_image_paths"]:
        if not os.path.exists(path):
            return ImageGenOutput(
                error=f"image path not found: {path}",
                generated_image_urls=[],
            )
    try:
        output = run_gemini_nano_banana(
            prompt=input["prompt"],
            img_paths=input["input_image_paths"],
        )
        return output
    except Exception as e:
        return ImageGenOutput(
            error=str(e),
            generated_image_urls=[],
        )


async def run_agent(video_path: str):
    if not os.path.exists(video_path):
        raise FileNotFoundError(f"Video file not found: {video_path}")
    # 1. detect scenes
    shots = extract_keyframes(video_path)

    # 2. run agent to generate spec.
    sys_prompt = f"""
        You are expert in breaking down a good video into specs and storyboards, later will be used for replicating this video.

        These input are keyframes of shots from a video, mostly commercial, ads, creative, or even viral shorts.

        Our workflow is we will first reverse engineer the video into a spec, then use the spec to create a new video to capture the ideas from the original video but with different assets.

        ## TASK
        0. first use the shell tool to inspect the ./tmp dir, which will hold all the keyframe image paths, and the nano banana image generation will also store images under ./tmp.!! ensure the image paths are all correct when you call from here!!
        1. closely analyze the shots, why they are good, and break down to precise accurate video spec along with all the shot specs details.
        2. analyze user input given product context and modify the video spec shots to fit.
        3. TODO: if users provide any context about the product they are selling, use that as reference to modify spets.
        4. use the the tool to create keyframes images with context, follow the attached nano banana prompt guide. Nano banana tool takes prompt + images as input.


        ## RULES
        - use the shell tools properly, e.g. read the images under ./tmp
        - WE DONT WANT to create similar images as the original video, we want to create NEW images that capture the essence, ideas, and concepts from the original video but with different assets. Apply that principle when creating prompts for nano banana image generation.
        - use the new shot spec to create & store all the shots, they should be consistent with other shots, ordering, pacing etc. Each shot has prompt + start frame image paths, use the nano banana tool to craft those images along with shell tool. This is critical. It's the storyboard for video generation.
        - we will use the video_prompt as well as start frame img for sora2 video gen, this means it's not necessarily better to have more shots, but rather sometimes better to combine them, specifcy them in the prompt following the good sora2 prompt guide, etc. since this improves output quality, video segments are concatenated later after we generate. Critical to follow the sora2 prompt guide.
        - per sora2 guide, each video genreration can take 1 input reference to guide. 
        - finally, use the sora2 video gen tool to create the video.

        ## Appendix
        ### Sora2 prompt guide
        {read_from_path("./src/static/sora2_prompt_guide.txt")}
        ### nano banana prompt guide
        {read_from_path("./src/static/nanobanana_prompt_guide.txt")}
    """
    agent: Agent[str] = Agent[str](
        name="Agent",
        model="gpt-5.1",
        instructions=sys_prompt,
        output_type=VideoSpec,
        hooks=LoggingHooks(),
        tools=[nano_banana_image_gen, shell_tool, gen_video_sora2],
    )

    product_image_input = to_img_inputs(["./tmp/hand_cream.png"])
    with trace("Video Generation workflow"):
        output = await Runner.run(
            agent,
            hooks=hooks,
            input=[
                # -------- shots info --------
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "input_text",
                            "text": "here are the shot keyframes from the reference video",
                        },
                        *[shot.to_response_input_image_param() for shot in shots],
                    ],
                },
                # -------- product info --------
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "input_text",
                            "text": "here's the product i'm selling",
                        },
                        *product_image_input,
                    ],
                },
            ],
        )
        spec = output.final_output_as(VideoSpec)
        print("Generated Video Spec:")
        print(spec.serialize())
        return spec


if __name__ == "__main__":
    import asyncio

    video_file_path = "./tmp/sample_1.mp4"

    asyncio.run(run_agent(video_file_path))
