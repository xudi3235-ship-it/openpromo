import asyncio
from pathlib import Path

from agents import function_tool
from openai.types import VideoModel, VideoSeconds, VideoSize

from src.core.shared import oai


@function_tool
async def gen_video_sora2(
    prompt: str,
    duration: VideoSeconds,
    video_size: VideoSize,
    input_reference: str,
    model: VideoModel = "sora-2",
):
    """
    generate video using sora2.
    Args:
        model: video generation model to use.
        prompt: prompt to guide video generation.
        model: video generation model to use.
        duration: duration of the video in seconds.
        video_size: size of the video.
        input_reference: path to the input reference image or video.
    """
    video = oai().videos.create(
        model=model,
        prompt=prompt,
        seconds=duration,
        size=video_size,
        input_reference=Path(input_reference),
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
    return {
        "status": "success",
        "message": f"Video generated and saved to {fout}",
        "output_path": fout,
    }
