import json
import subprocess
import uuid
from pathlib import Path
from typing import Dict, List, Optional
from dataclasses import dataclass
import modal
import os
import logging
from dotenv import load_dotenv

load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class CivitaiModel:
    name: str
    model_id: str
    model_type: str = "Model"
    format: str = "SafeTensor"
    size: str = "full"
    fp: str = "fp16"
    # where to store the models
    comfyui_dir: str = "checkpoints"

    def get_url(self):
        key = "CIVITAI_API_KEY"
        api_key = os.environ.get(key, None)
        if api_key is None:
            raise ValueError(f"Missing {key} in env vars")

        base_url = f"https://civitai.com/api/download/models/{self.model_id}?type={self.model_type}&format={self.format}&size={self.size}"
        if self.fp:
            base_url += f"&fp={self.fp}"
        return f"{base_url}&token={api_key}"


# Define available models by category
checkpoint_models = [
    CivitaiModel(
        name="civitai_realistic_stock_photo",
        model_id="524032",
        comfyui_dir="checkpoints",
    ),
    CivitaiModel(
        name="civitai_realistic_vision_v6_b1",
        model_id="501240",
        comfyui_dir="checkpoints",
    ),
    CivitaiModel(
        name="civitai_real_vis_xl_v5",
        model_id="798204",
        comfyui_dir="checkpoints",
    ),
]

# lora_models = [
#     CivitaiModel(
#         name="example_lora_model",
#         model_id="12345",  # Replace with actual ID
#         model_type="LORA",
#         comfyui_dir="loras",
#     ),
# ]

# unet_models = [
#     CivitaiModel(
#         name="example_unet_model",
#         model_id="67890",  # Replace with actual ID
#         model_type="UNET",
#         comfyui_dir="unet",
#     ),
# ]


class ModelDownloader:
    def __init__(self, cache_base_dir: str = "/cache"):
        self.cache_base_dir = Path(cache_base_dir)
        self.models_dir = Path("/root/comfy/ComfyUI/models")

    def download_model(self, model: CivitaiModel) -> str:
        """Download a single model and create symlink in the appropriate ComfyUI directory"""
        import requests
        import time

        cache_dir = self.cache_base_dir / "civitai" / model.comfyui_dir
        cache_dir.mkdir(parents=True, exist_ok=True)

        target_dir = self.models_dir / model.comfyui_dir
        target_dir.mkdir(parents=True, exist_ok=True)

        url = model.get_url()
        cache_path = cache_dir / f"{model.name}.safetensors"
        target_path = target_dir / f"{model.name}.safetensors"

        logger.info(f"Downloading {model.name} to {cache_path}")

        if not cache_path.exists():
            start_time = time.time()
            response = requests.get(url, stream=True)
            response.raise_for_status()

            total_size = int(response.headers.get("content-length", 0))
            downloaded = 0

            with open(cache_path, "wb") as f:
                for chunk in response.iter_content(chunk_size=8192):
                    if chunk:
                        f.write(chunk)
                        downloaded += len(chunk)

                        # Log progress for large files
                        if total_size > 0 and downloaded % (100 * 1024 * 1024) < 8192:
                            elapsed = time.time() - start_time
                            percent = downloaded / total_size * 100
                            speed = (
                                downloaded / (1024 * 1024 * elapsed)
                                if elapsed > 0
                                else 0
                            )
                            logger.info(
                                f"{model.name}: {percent:.1f}% ({downloaded / (1024 * 1024):.1f}MB of {total_size / (1024 * 1024):.1f}MB) at {speed:.1f}MB/s"
                            )

            elapsed = time.time() - start_time
            speed = downloaded / (1024 * 1024 * elapsed) if elapsed > 0 else 0
            logger.info(
                f"Downloaded {model.name} ({downloaded / (1024 * 1024):.1f}MB) in {elapsed:.1f}s ({speed:.1f}MB/s)"
            )
        else:
            logger.info(f"Using cached {model.name} from {cache_path}")

        # Create symlink to the right ComfyUI directory
        if target_path.exists():
            target_path.unlink()

        subprocess.run(
            ["ln", "-s", str(cache_path), str(target_path)],
            check=True,
        )
        return f"Completed setup for {model.name}"

    def download_models(
        self, models: List[CivitaiModel], max_workers: Optional[int] = None
    ):
        """Download multiple models in parallel"""
        import concurrent.futures

        if not models:
            logger.info("No models to download")
            return

        max_workers = max_workers or len(models)
        logger.info(f"Downloading {len(models)} models with {max_workers} workers")

        with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
            future_to_model = {
                executor.submit(self.download_model, model): model for model in models
            }
            for future in concurrent.futures.as_completed(future_to_model):
                model = future_to_model[future]
                try:
                    result = future.result()
                    logger.info(result)
                except Exception as exc:
                    logger.error(f"{model.name} generated an exception: {exc}")


def civitai_download():
    """Download all Civitai models"""
    downloader = ModelDownloader(cache_base_dir="/cache")

    # Download models by type
    all_models = checkpoint_models
    downloader.download_models(all_models)


def hf_download():
    """Download models from Hugging Face"""
    from huggingface_hub import hf_hub_download

    flux_model = hf_hub_download(
        repo_id="Comfy-Org/flux1-schnell",
        filename="flux1-schnell-fp8.safetensors",
        cache_dir="/cache",
    )

    # Create the checkpoints directory if it doesn't exist
    checkpoints_dir = Path("/root/comfy/ComfyUI/models/checkpoints")
    checkpoints_dir.mkdir(parents=True, exist_ok=True)

    target_path = checkpoints_dir / "flux1-schnell-fp8.safetensors"
    if target_path.exists():
        target_path.unlink()

    # symlink the model to the right ComfyUI directory
    subprocess.run(
        f"ln -s {flux_model} {target_path}",
        shell=True,
        check=True,
    )


vol = modal.Volume.from_name("hf-hub-cache", create_if_missing=True)
image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install(["git", "wget"])  # install git to clone ComfyUI
    .pip_install("fastapi[standard]==0.115.11")  # install web dependencies
    .pip_install("comfy-cli==1.3.8")  # install comfy-cli
    .pip_install("requests==2.31.0")  # for improved downloading
    .run_commands(  # use comfy-cli to install ComfyUI and its dependencies
        "comfy --skip-prompt install --nvidia --version 0.3.10"
    )
    # download a custom node
    .run_commands("comfy node install was-node-suite-comfyui@1.0.2")
    .pip_install("huggingface_hub[hf_transfer]==0.26.2")
    .env(
        {
            "HF_HUB_ENABLE_HF_TRANSFER": "1",
            "CIVITAI_API_KEY": os.environ["CIVITAI_API_KEY"],
        }
    )
    .run_function(
        hf_download,
        # persist the HF cache to a Modal Volume so future runs don't re-download models
        volumes={"/cache": vol},
    )
    .run_function(civitai_download, volumes={"/cache": vol})
    # add the workflow api config
    .add_local_file(
        Path(__file__).parent / "workflow_api.json", "/root/workflow_api.json"
    )
)

app = modal.App(name="promobase-comfyui", image=image)


@app.function(
    allow_concurrent_inputs=10,
    max_containers=1,
    gpu="L40S",
    volumes={"/cache": vol},
)
@modal.web_server(8000, startup_timeout=60)
def ui():
    subprocess.Popen("comfy launch -- --listen 0.0.0.0 --port 8000", shell=True)


@app.cls(
    allow_concurrent_inputs=10,
    scaledown_window=300,
    gpu="L40S",
    volumes={"/cache": vol},
    secrets=[modal.Secret.from_name("openpromo-secrets")],
)
class ComfyUI:
    @modal.enter()
    def launch_comfy_background(self):
        cmd = "comfy launch --background"
        subprocess.run(cmd, shell=True, check=True)

    @modal.method()
    def infer(self, workflow_path: str = "/root/workflow_api.json"):
        # runs the comfy run --workflow command as a subprocess
        cmd = f"comfy run --workflow {workflow_path} --wait --timeout 1200"
        subprocess.run(cmd, shell=True, check=True)

        # completed workflows write output images to this directory
        output_dir = "/root/comfy/ComfyUI/output"

        # looks up the name of the output image file based on the workflow
        workflow = json.loads(Path(workflow_path).read_text())
        file_prefix = [
            node.get("inputs")
            for node in workflow.values()
            if node.get("class_type") == "SaveImage"
        ][0]["filename_prefix"]

        # returns the image as bytes
        for f in Path(output_dir).iterdir():
            if f.name.startswith(file_prefix):
                return f.read_bytes()

    @modal.fastapi_endpoint(method="POST")
    def api(self, item: Dict):
        from fastapi import Response

        workflow_data = json.loads(
            (Path(__file__).parent / "workflow_api.json").read_text()
        )

        # insert the prompt
        workflow_data["6"]["inputs"]["text"] = item["prompt"]

        # give the output image a unique id per client request
        client_id = uuid.uuid4().hex
        workflow_data["9"]["inputs"]["filename_prefix"] = client_id

        # save this updated workflow to a new file
        new_workflow_file = f"{client_id}.json"
        json.dump(workflow_data, Path(new_workflow_file).open("w"))

        # run inference on the currently running container
        img_bytes = self.infer.local(new_workflow_file)

        return Response(img_bytes, media_type="image/jpeg")
