import modal

import os
from pathlib import Path
from src.utils import create_symlinks_recursive


def download_spark_tts_model():
    from huggingface_hub import snapshot_download

    cache_dir = Path("/cache/spark_tts/pretrained_models/Spark-TTS-0.5B")
    cache_dir.mkdir(parents=True, exist_ok=True)
    target_dir = Path("/spark_tts/pretrained_models/Spark-TTS-0.5B")
    target_dir.mkdir(parents=True, exist_ok=True)

    snapshot_download(
        "SparkAudio/Spark-TTS-0.5B",
        local_dir=cache_dir,
    )

    create_symlinks_recursive(cache_dir, target_dir)


def download_resemble_fn():
    """Download and cache the Resemble enhance model to the mounted volume"""
    import logging
    import subprocess

    REPO_URL = "https://huggingface.co/ResembleAI/resemble-enhance"
    # Store in the Modal volume instead of the default package location
    REPO_DIR = Path("/cache/resemble_model")

    logger = logging.getLogger(__name__)

    logger.info("Downloading the Resemble model to cache...")

    if REPO_DIR.exists() and (REPO_DIR / ".git").exists():
        logger.info("Repository already exists, attempting to pull latest changes...")
        subprocess.run(
            ["git", "-C", str(REPO_DIR), "pull"],
            check=True,
            env={**os.environ, "GIT_LFS_SKIP_SMUDGE": "1"},
        )
    else:
        logger.info("Cloning the repository...")
        os.makedirs(REPO_DIR, exist_ok=True)
        subprocess.run(
            ["git", "clone", REPO_URL, str(REPO_DIR)],
            check=True,
            env={**os.environ, "GIT_LFS_SKIP_SMUDGE": "1"},
        )

    logger.info("Pulling large files...")
    subprocess.run(["git", "-C", str(REPO_DIR), "lfs", "pull"], check=True)

    logger.info("Model download completed")


vol = modal.Volume.from_name("cache", create_if_missing=True)

audio_enhance_image = (
    modal.Image.debian_slim(python_version="3.10")
    .apt_install(["wget", "git", "git-lfs"])
    .pip_install("resemble-enhance")
    .run_function(download_resemble_fn, volumes={"/cache": vol})
    .env({"RESEMBLE_ENHANCE_RUN_DIR": "/cache/resemble_model/enhancer_stage2"})
)


# ref: https://github.com/SparkAudio/Spark-TTS
spark_tts_image = (
    modal.Image.debian_slim(python_version="3.12")
    .apt_install(["git", "git-lfs"])
    .run_commands("git clone https://github.com/SparkAudio/Spark-TTS spark_tts")
    .workdir("/spark_tts")
    .run_commands("pip install -r requirements.txt")
    .run_function(download_spark_tts_model, volumes={"/cache": vol})
    .env({"SPARK_TTS_MODEL_PATH": "pretrained_models/Spark-TTS-0.5B"})
)
