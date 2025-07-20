import modal
from pathlib import Path

app = modal.App(name="faceswap-api")
vol = modal.Volume.from_name("cache", create_if_missing=True)

image = (
    modal.Image.from_registry(
        " nvidia/cuda:11.8.0-cudnn8-runtime-ubuntu22.04", add_python="3.10"
    )
    .env({"DEBIAN_FRONTEND": "noninteractive", "FACESWAP_BACKEND": "nvidia"})
    .run_commands(
        "apt-get update -qq -y && apt-get upgrade -y ",
        "apt-get install -y libgl1 libglib2.0-0 python3-tk git",
    )
    .run_commands(
        "git clone --depth 1 --no-single-branch https://github.com/deepfakes/faceswap.git /repo"
    )
    .workdir("/repo")
    .run_commands(
        "pip --no-cache-dir install -r ./requirements/requirements_nvidia.txt"
    )
)

# ref https://github.com/s0md3v/roop
roop_img = (
    modal.Image.from_registry(
        " nvidia/cuda:11.8.0-cudnn8-runtime-ubuntu22.04", add_python="3.10"
    )
    .env({"DEBIAN_FRONTEND": "noninteractive", "FACESWAP_BACKEND": "nvidia"})
    .run_commands(
        "apt-get update -qq -y && apt-get upgrade -y ",
        "apt-get install -y libgl1 libglib2.0-0 ffmpeg git clang",
    )
    .run_commands("git clone https://github.com/s0md3v/roop /roop")
    .workdir("/roop")
    .run_commands("pip install -r requirements.txt")
    .run_commands("pip install onnxruntime-gpu==1.15.1")
)


@app.function(
    image=image,
    volumes={"/cache": vol},
    gpu="L40S",
    max_containers=1,
)
def run_faceswap():
    from subprocess import run

    cmd = "python faceswap.py --help"
    run(cmd, shell=True, check=True)
    raise NotImplementedError("example not ready yet")


@app.function(image=roop_img, volumes={"/cache": vol}, gpu="L40S")
def run_roop():
    from subprocess import run

    cmd = [
        "python",
        "run.py",
        "--help",
    ]
    run(cmd, check=True)


@app.local_entrypoint()
def main():
    run_roop.remote()
