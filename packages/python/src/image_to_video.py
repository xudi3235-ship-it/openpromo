import io
import random
import time
from pathlib import Path
from typing import Annotated

import fastapi
import modal


app = modal.App("example-image-to-video")


image = (
    modal.Image.debian_slim(python_version="3.12")
    .apt_install("python3-opencv")
    .pip_install(
        "accelerate==1.4.0",
        "diffusers==0.32.2",
        "fastapi[standard]==0.115.8",
        "huggingface-hub[hf_transfer]==0.29.1",
        "imageio==2.37.0",
        "imageio-ffmpeg==0.6.0",
        "opencv-python==4.11.0.86",
        "pillow==11.1.0",
        "sentencepiece==0.2.0",
        "torch==2.6.0",
        "torchvision==0.21.0",
        "transformers==4.49.0",
    )
)


MODEL_ID = "Lightricks/LTX-Video"
MODEL_REVISION_ID = "a6d59ee37c13c58261aa79027d3e41cd41960925"

# Hugging Face will also cache the weights to disk once they're downloaded.
# But Modal Functions are serverless, and so even disks are ephemeral,
# which means the weights would get re-downloaded every time we spin up a new instance.

# We can fix this -- without any modifications to Hugging Face's model loading code! --
# by pointing the Hugging Face cache at a [Modal Volume](https://modal.com/docs/guide/volumes).

model_volume = modal.Volume.from_name("hf-hub-cache", create_if_missing=True)

MODEL_PATH = "/models"  # where the Volume will appear on our Functions' filesystems

image = image.env(
    {
        "HF_HUB_ENABLE_HF_TRANSFER": "1",  # faster downloads
        "HF_HUB_CACHE": MODEL_PATH,
    }
)

OUTPUT_PATH = "/outputs"
output_volume = modal.Volume.from_name("outputs", create_if_missing=True)


with image.imports():  # loaded on all of our remote Functions
    import diffusers
    import torch
    from PIL import Image

MINUTES = 60


@app.cls(
    image=image,
    gpu="H100",
    timeout=10 * MINUTES,
    scaledown_window=10 * MINUTES,
    volumes={MODEL_PATH: model_volume, OUTPUT_PATH: output_volume},
)
class Inference:
    @modal.enter()
    def load_pipeline(self):
        self.pipe = diffusers.LTXImageToVideoPipeline.from_pretrained(  # type: ignore
            MODEL_ID,
            revision=MODEL_REVISION_ID,
            torch_dtype=torch.bfloat16,
        ).to("cuda")

    @modal.method()
    def run(
        self,
        image_bytes: bytes,
        prompt: str,
        negative_prompt: str = None,  # type: ignore
        num_frames: int = None,  # type: ignore
        num_inference_steps: int = None,  # type: ignore
        seed: int = None,  # type: ignore
    ) -> str:
        negative_prompt = (
            negative_prompt
            or "worst quality, inconsistent motion, blurry, jittery, distorted"
        )
        width = 768
        height = 512
        num_frames = num_frames or 25
        num_inference_steps = num_inference_steps or 50
        seed = seed or random.randint(0, 2**32 - 1)
        print(f"Seeding RNG with: {seed}")
        torch.manual_seed(seed)

        image = diffusers.utils.load_image(Image.open(io.BytesIO(image_bytes)))  # type: ignore

        video = self.pipe(
            image=image,
            prompt=prompt,
            negative_prompt=negative_prompt,
            width=width,
            height=height,
            num_frames=num_frames,
            num_inference_steps=num_inference_steps,
        ).frames[0]  # type: ignore

        mp4_name = slugify(prompt)
        diffusers.utils.export_to_video(  # type: ignore
            video,  # type: ignore
            f"{Path(OUTPUT_PATH) / mp4_name}",
            fps=24,  # type: ignore
        )
        output_volume.commit()
        torch.cuda.empty_cache()  # reduce fragmentation
        return mp4_name

    @modal.fastapi_endpoint(method="POST", docs=True)
    def web(
        self,
        image_bytes: Annotated[bytes, fastapi.File()],
        prompt: str,
        negative_prompt: str = None,  # type: ignore
        num_frames: int = None,  # type: ignore
        num_inference_steps: int = None,  # type: ignore
        seed: int = None,  # type: ignore
    ) -> fastapi.Response:
        mp4_name = self.run.local(  # run in the same container
            image_bytes=image_bytes,
            prompt=prompt,
            negative_prompt=negative_prompt,
            num_frames=num_frames,
            num_inference_steps=num_inference_steps,
            seed=seed,
        )
        return fastapi.responses.FileResponse(
            path=f"{Path(OUTPUT_PATH) / mp4_name}",
            media_type="video/mp4",
            filename=mp4_name,
        )


# ## Generating videos from the command line

# We add a [local entrypoint](https://modal.com/docs/reference/modal.App#local_entrypoint)
# that calls the `Inference.run` method to run inference from the command line.
# The function's parameters are automatically turned into a CLI.

# Run it with

# ```bash
# modal run image_to_video.py --prompt "A cat looking out the window at a snowy mountain" --image-path /path/to/cat.jpg
# ```

# You can also pass `--help` to see the full list of arguments.


@app.local_entrypoint()
def entrypoint(
    image_path: str,
    prompt: str,
    negative_prompt: str = None,  # type: ignore
    num_frames: int = None,  # type: ignore
    num_inference_steps: int = None,  # type: ignore
    seed: int = None,  # type: ignore
    twice: bool = True,
):
    import os
    import urllib.request

    print(f"🎥 Generating a video from the image at {image_path}")
    print(f"🎥 using the prompt {prompt}")

    if image_path.startswith(("http://", "https://")):
        image_bytes = urllib.request.urlopen(image_path).read()
    elif os.path.isfile(image_path):
        image_bytes = Path(image_path).read_bytes()
    else:
        raise ValueError(f"{image_path} is not a valid file or URL.")

    inference_service = Inference()

    for _ in range(1 + twice):
        start = time.time()
        mp4_name = inference_service.run.remote(
            image_bytes=image_bytes,
            prompt=prompt,
            negative_prompt=negative_prompt,
            num_frames=num_frames,
            seed=seed,
        )
        duration = time.time() - start
        print(f"🎥 Generated video in {duration:.3f}s")

        output_dir = Path("/tmp/image_to_video")
        output_dir.mkdir(exist_ok=True, parents=True)
        output_path = output_dir / mp4_name
        # read in the file from the Modal Volume, then write it to the local disk
        output_path.write_bytes(b"".join(output_volume.read_file(mp4_name)))
        print(f"🎥 Video saved to {output_path}")


def slugify(s: str) -> str:
    return f"{time.strftime('%Y%m%d_%H%M%S')}_{''.join(c if c.isalnum() else '-' for c in s[:100]).strip('-')}.mp4"
