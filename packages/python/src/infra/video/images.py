from pathlib import Path
import modal
import logging

from src.utils import create_symlinks_recursive

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


app = modal.App(name="latent_sync")
vol = modal.Volume.from_name("cache", create_if_missing=True)


def download_hf_model():
    from subprocess import run
    from pathlib import Path

    cache_dir = Path("/cache/latent_sync")
    target_dir = Path("/LatentSync/checkpoints")
    cache_dir.mkdir(parents=True, exist_ok=True)
    target_dir.mkdir(parents=True, exist_ok=True)
    # 1. use the huggingface-cli to download the model to the cache dir
    run(
        f"huggingface-cli download ByteDance/LatentSync-1.5 --local-dir {cache_dir} --exclude '*.git*' 'README.md'",
        shell=True,
        check=True,
    )
    logger.info(f"model downloaded to {cache_dir}")

    # 2. Recursively create symlinks for all files
    create_symlinks_recursive(cache_dir, target_dir)

    # List files to verify
    run(f"ls -la {target_dir}", shell=True, check=True)
    run(f"find {target_dir} -type l | wc -l", shell=True, check=True)
    logger.info(f"Symlinks created recursively from {cache_dir} to {target_dir}")


latent_sync_image = (
    modal.Image.debian_slim(python_version="3.10")
    .apt_install("git", "wget", "git-lfs", "libgl1", "curl", "bzip2", "ffmpeg")
    .run_commands("git clone https://github.com/bytedance/LatentSync")
    .workdir("/LatentSync")
    .pip_install("huggingface_hub[cli]")
    .run_function(download_hf_model, volumes={"/cache": vol})
    .run_commands("pip install -r requirements.txt")
    .add_local_python_source("src", "fn")
)


def download_models_musetalk():
    from subprocess import run
    from pathlib import Path

    cache_dir = Path("/cache/musetalk/models")
    target_dir = Path("/musetalk/models")
    cache_dir.mkdir(parents=True, exist_ok=True)
    target_dir.mkdir(parents=True, exist_ok=True)

    # Download MuseTalk weights
    run(
        f"huggingface-cli download TMElyralab/MuseTalk --local-dir {cache_dir}",
        shell=True,
        check=True,
    )

    # Download SD VAE weights
    run(
        f"huggingface-cli download stabilityai/sd-vae-ft-mse --local-dir {cache_dir}/sd-vae --include 'config.json' 'diffusion_pytorch_model.bin'",
        shell=True,
        check=True,
    )

    # Download Whisper weights
    run(
        f"huggingface-cli download openai/whisper-tiny --local-dir {cache_dir}/whisper --include 'config.json' 'pytorch_model.bin' 'preprocessor_config.json'",
        shell=True,
        check=True,
    )

    # Download DWPose weights
    run(
        f"huggingface-cli download yzd-v/DWPose --local-dir {cache_dir}/dwpose --include 'dw-ll_ucoco_384.pth'",
        shell=True,
        check=True,
    )

    # Download SyncNet weights
    run(
        f"huggingface-cli download ByteDance/LatentSync --local-dir {cache_dir}/syncnet --include 'latentsync_syncnet.pt'",
        shell=True,
        check=True,
    )

    # Download Face Parse Bisent weights (using gdown)
    face_parse_dir = cache_dir / "face-parse-bisent"
    face_parse_dir.mkdir(parents=True, exist_ok=True)
    run(
        f"gdown --id 154JgKpzCPW82qINcVieuPH3fZ2e0P812 -O {face_parse_dir}/79999_iter.pth",
        shell=True,
        check=True,
    )

    # Download ResNet weights
    run(
        f"curl -L https://download.pytorch.org/models/resnet18-5c106cde.pth -o {face_parse_dir}/resnet18-5c106cde.pth",
        shell=True,
        check=True,
    )

    # Recursively symlink everything from cache_dir to target_dir
    create_symlinks_recursive(cache_dir, target_dir)


muse_talk_image = (
    modal.Image.from_registry(
        " nvidia/cuda:11.8.0-cudnn8-runtime-ubuntu22.04", add_python="3.10"
    )
    .env({"DEBIAN_FRONTEND": "noninteractive", "FACESWAP_BACKEND": "nvidia"})
    .run_commands(
        "apt-get update -qq -y && apt-get upgrade -y ",
        "apt-get install -y libgl1 libglib2.0-0 python3-tk git ffmpeg curl",
    )
    .run_commands("git clone https://github.com/TMElyralab/MuseTalk /musetalk")
    .workdir("/musetalk")
    .run_commands(
        "pip install torch==2.0.1 torchvision==0.15.2 torchaudio==2.0.2 --index-url https://download.pytorch.org/whl/cu118",
        "pip install -r requirements.txt",
    )
    .run_commands("pip install --no-cache-dir -U openmim")
    .run_commands(
        "mim install mmengine",
        'mim install "mmcv==2.0.1"',
        'mim install "mmdet==3.1.0"',
        'mim install "mmpose==1.1.0"',
    )
    .run_function(download_models_musetalk, volumes={"/cache": vol})
    .add_local_python_source("src", "fn")
)


def download_models_hunyuan_i2v():
    from subprocess import run

    cache_dir = Path("/cache/hunyuan_i2v/ckpts")
    target_dir = Path("/hunyuan_i2v/ckpts")

    run(
        f"huggingface-cli download tencent/HunyuanVideo-I2V --local-dir {cache_dir}",
        shell=True,
        check=True,
    )
    run(
        f"huggingface-cli download xtuner/llava-llama-3-8b-v1_1-transformers --local-dir {cache_dir}/text_encoder_i2v",
        shell=True,
        check=True,
    )
    run(
        f"huggingface-cli download openai/clip-vit-large-patch14 --local-dir {cache_dir}/text_encoder_2",
        shell=True,
        check=True,
    )
    create_symlinks_recursive(cache_dir, target_dir)


hunyuan_i2v_image = (
    modal.Image.from_registry(
        "nvidia/cuda:12.4.1-cudnn-devel-ubuntu22.04",
        add_python="3.11",
    )
    .env({"DEBIAN_FRONTEND": "noninteractive", "FACESWAP_BACKEND": "nvidia"})
    .run_commands(
        "apt-get update -qq -y && apt-get upgrade -y ",
        "apt-get install -y libgl1 libglib2.0-0 python3-tk git ffmpeg curl",
    )
    # https://github.com/Tencent/HunyuanVideo-I2V?tab=readme-ov-file#%EF%B8%8F-dependencies-and-installation
    .run_commands("git clone https://github.com/tencent/HunyuanVideo-I2V /hunyuan_i2v")
    .workdir("/hunyuan_i2v")
    .run_commands(
        "pip install torch==2.4.0 torchvision==0.19.0 torchaudio==2.4.0 --extra-index-url https://download.pytorch.org/whl/cu124",
        "pip install -r requirements.txt",
        "pip install huggingface_hub[hf_transfer]==0.26.2 xfuser==0.4.0 ninja flash-attn==2.6.3",
    )
    .run_commands(
        "pip install torch==2.4.0 torchvision==0.19.0 torchaudio==2.4.0 --extra-index-url https://download.pytorch.org/whl/cu124",
        "pip install -r requirements.txt",
    )
    .env({"HF_HUB_ENABLE_HF_TRANSFER": "1"})
    .run_function(download_models_hunyuan_i2v, volumes={"/cache": vol})
    .add_local_python_source("src", "fn")
)


def download_hf_models_magi():
    from subprocess import run

    cache_dir = Path("/cache/magi/downloads")
    target_dir = Path("/magi/downloads")

    run(
        f"huggingface-cli download sand-ai/MAGI-1 --local-dir {cache_dir}",
        shell=True,
        check=True,
    )
    create_symlinks_recursive(cache_dir, target_dir)


# TODO: implement https://github.com/SandAI-org/MAGI-1
magi_image = (
    modal.Image.from_registry(
        "nvidia/cuda:12.4.1-cudnn-devel-ubuntu22.04",
        add_python="3.11",
    )
    .env({"DEBIAN_FRONTEND": "noninteractive", "FACESWAP_BACKEND": "nvidia"})
    .run_commands(
        "apt-get update -qq -y && apt-get upgrade -y ",
        "apt-get install -y libgl1 libglib2.0-0 python3-tk git ffmpeg curl clang",
    )
    .run_commands("git clone https://github.com/SandAI-org/MAGI-1 /magi")
    .workdir("/magi")
    .run_commands(
        "pip install packaging matplotlib rich",
        "pip install torch==2.4.0 torchvision==0.19.0 torchaudio==2.4.0 --extra-index-url https://download.pytorch.org/whl/cu124",
    )
    .run_commands(
        "pip install "
        "accelerate==0.32.1 "
        "beautifulsoup4==4.13.4 "
        "debugpy==1.8.14 "
        "diffusers==0.29.2 "
        "einops>=0.6.0 "
        "ffmpeg-python "
        "flash-attn==2.7.3 "  # original is 2.4.2, build is slow as fuck
        "flashinfer-python==0.2.0.post2 --extra-index-url https://flashinfer.ai/whl/cu124/torch2.4/ "
        "ftfy==6.2.0 "
        "gpustat==1.1.1 "
        "imageio==2.34.0 "
        "imageio[ffmpeg] "
        "numpy==1.26.4 "
        "protobuf==5.28.3 "
        "sentencepiece==0.2.0 "
        "timm==1.0.15 "
        "torchdiffeq==0.2.4 "
        "transformers==4.42.3"
    )
    # .run_commands(
    #     "pip install -r requirements.txt",
    # )
    .run_commands(
        "git clone https://github.com/SandAI-org/MagiAttention",
        "cd MagiAttention && git submodule update --init --recursive && pip install --no-build-isolation .",
    )
    .run_function(download_hf_models_magi, volumes={"/cache": vol})
    .add_local_python_source("src", "fn")
)


def download_hf_models_ltx_video():
    from subprocess import run
    from pathlib import Path
    from huggingface_hub import hf_hub_download

    target_dir = Path("/ltx-video/ckpt")
    target_dir.mkdir(parents=True, exist_ok=True)

    files = [
        "ltxv-2b-0.9.6-distilled-04-25.safetensors",
        "ltxv-2b-0.9.6-dev-04-25.safetensors",
    ]

    def _inner_f(fname):
        model = hf_hub_download(
            repo_id="Lightricks/LTX-Video",
            filename=fname,
            cache_dir="/cache",
        )
        run("ln -s {} {}".format(model, target_dir), shell=True, check=True)
        print(f"Symlink created for {fname} in {target_dir}")

    for fname in files:
        _inner_f(fname)


___ltx_video_image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install(
        "accelerate==0.33.0",
        "diffusers==0.33.1",
        "huggingface-hub[hf_transfer]==0.27.0",
        "sentencepiece==0.2.0",
        "torch==2.5.1",
        "torchvision==0.20.1",
        "transformers==4.47.0",
    )
    .env({"HF_HUB_ENABLE_HF_TRANSFER": "1"})
    .run_function(download_hf_models_ltx_video, volumes={"/cache": vol})
)

ltx_video_image = (
    modal.Image.from_registry(
        "nvidia/cuda:12.4.1-cudnn-devel-ubuntu22.04",
        add_python="3.11",
    )
    .env({"DEBIAN_FRONTEND": "noninteractive", "FACESWAP_BACKEND": "nvidia"})
    .run_commands(
        "apt-get update -qq -y && apt-get upgrade -y ",
        "apt-get install -y libgl1 libglib2.0-0 python3-tk git ffmpeg curl clang",
    )
    .run_commands("git clone https://github.com/Lightricks/LTX-Video /ltx-video")
    .workdir("/ltx-video")
    .run_commands("python -m pip install -e .\[inference-script\]")
    .run_function(download_hf_models_ltx_video, volumes={"/cache": vol})
)
