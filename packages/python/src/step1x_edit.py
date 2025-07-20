import modal
from pathlib import Path, PurePosixPath
from src.utils import create_symlinks_recursive

model_vol = modal.Volume.from_name("hf-hub-cache", create_if_missing=True)
output_vol = modal.Volume.from_name("outputs", create_if_missing=True)
MODEL_PATH = "/models"
OUTPUT_PATH = "/outputs"

"""
example from https://github.com/stepfun-ai/Step1X-Edit
SOTA image editing model
"""
app = modal.App("example-step1x-edit")
vols = {
    MODEL_PATH: model_vol,
    OUTPUT_PATH: output_vol,
}


def download_hf_models():
    from huggingface_hub import snapshot_download

    local_dir = Path("/models/step1x-edit/ckpts")
    local_dir.mkdir(parents=True, exist_ok=True)
    cache_dir = Path("/step-1x-edit/ckpts")
    cache_dir.mkdir(parents=True, exist_ok=True)

    snapshot_download(
        "stepfun-ai/Step1X-Edit",
        allow_patterns=["*.safetensors"],
        local_dir=local_dir,
    )
    create_symlinks_recursive(
        local_dir,
        cache_dir,
    )


image = (
    modal.Image.from_registry(
        "nvidia/cuda:12.4.1-cudnn-devel-ubuntu22.04",
        add_python="3.11",
        setup_dockerfile_commands=[
            "ENV DEBIAN_FRONTEND=noninteractive",
            "RUN apt-get update -qq -y && apt-get upgrade -y",
            "RUN apt-get install -y libgl1 libglib2.0-0 python3-tk git ffmpeg curl clang",
        ],
    )
    .run_commands("git clone https://github.com/stepfun-ai/Step1X-Edit /step-1x-edit")
    .workdir("/step-1x-edit")
    .run_commands("pip install -r requirements.txt")
    # flash-attention
    .run_commands(
        "pip install packaging ninja huggingface-hub[hf_transfer]==0.29.1",
        "pip install flash-attn==2.7.3",
    )
    .run_commands("pip install torchvision")
    .env(
        {
            "HF_HUB_ENABLE_HF_TRANSFER": "1",  # faster downloads
            "HF_HUB_CACHE": MODEL_PATH,
        }
    )
    .run_function(
        download_hf_models,
        volumes=vols,  # type: ignore
    )
)


@app.cls(
    image=image,
    gpu="A100-80GB",
    volumes=vols,  # type: ignore
)
class Step1XEdit:
    output_dir: str = modal.parameter(default="/outputs")

    @modal.enter()
    def enter(self):
        from inference import ImageGenerator  # type: ignore
        import os

        os.makedirs(self.output_dir, exist_ok=True)

        model_path: str = "/step-1x-edit/ckpts"
        quantized: bool = False
        offload: bool = False

        self.image_edit = ImageGenerator(
            ae_path=os.path.join(model_path, "vae.safetensors"),
            dit_path=os.path.join(
                model_path,
                "step1x-edit-i1258-FP8.safetensors"
                if quantized
                else "step1x-edit-i1258.safetensors",
            ),
            qwen2vl_model_path="Qwen/Qwen2.5-VL-7B-Instruct",
            max_length=640,
            quantized=quantized,
            offload=offload,
        )

    @modal.method()
    def infer(
        self,
        img_path: str,
        prompt: str,
        seed: int = 1234,
        cfg_guidance: float = 6.0,
        num_steps: int = 28,
        size_level: int = 1024,
    ) -> bytes:
        import os
        from PIL import Image

        if not os.path.exists(img_path):
            raise FileNotFoundError(f"Image not found: {img_path}")

        output_path = os.path.join(self.output_dir, os.path.basename(img_path))

        image = self.image_edit.generate_image(
            prompt,
            negative_prompt="",
            ref_images=Image.open(img_path).convert("RGB"),
            num_samples=1,
            num_steps=num_steps,
            cfg_guidance=cfg_guidance,
            seed=seed,
            show_progress=True,
            size_level=size_level,
        )[0]
        image.save(output_path, lossless=True)

        with open(output_path, "rb") as f:
            return f.read()


@app.local_entrypoint()
def main():
    Step1XEdit().infer.remote(
        img_path="./examples/0000.jpg",
        prompt="Add pendant with a ruby around this girl's neck.",
    )
