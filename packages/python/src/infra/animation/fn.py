import modal
from pathlib import Path

app = modal.App(name="promobase-manim")
vol = modal.Volume.from_name("cache")


python_deps = ["manim", "manim-voiceover[openai]"]
manim_install_cmds = [
    "apt-get update",
    "apt install texlive-full ffmpeg build-essential python3-dev libcairo2-dev libpango1.0-dev -y",
]
image = (
    modal.Image.debian_slim(python_version="3.10")
    .run_commands(*manim_install_cmds)
    .pip_install(*python_deps)
    .workdir("/app")
    .add_local_dir(
        Path(__file__).parent.parent.parent.parent / "manim-projects",
        "/app/manim-projects",
        ignore=[
            ".venv",
            ".git",
            "**/.ruff_cache",
            "**/__pycache__",
            "*.pyc",
            "*.pyo",
            "*.pyd",
            "**/media",
        ],
    )
)


@app.function(image=image)
def render(project_name: str):
    # print out the directory structure
    from subprocess import run
    import os

    # 1. change to the project directory
    project_dir = Path("/app/manim-projects") / project_name
    if not project_dir.exists():
        raise FileNotFoundError(f"Project directory {project_dir} does not exist.")
    os.chdir(project_dir)
    run("ls -l", shell=True)

    # 2. build
    cmd = "manim main.py"
    run(cmd, check=True, shell=True)

    pass


@app.local_entrypoint()
def main(project_name: str = "stat-arb-intro"):
    render.remote(project_name)
