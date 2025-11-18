import os

import replicate
from google import genai
from openai import OpenAI


def get_env_or_raise(key: str) -> str:
    value = os.environ.get(key)
    if not value:
        raise ValueError(f"{key} not set in environment variables")
    return value


def oai() -> OpenAI:
    return OpenAI(api_key=get_env_or_raise("OPENAI_API_KEY"))


def gemini():
    return genai.Client(
        api_key=get_env_or_raise("GEMINI_API_KEY"),
    )


def rep() -> replicate.Client:
    return replicate.Client(api_token=get_env_or_raise("REPLICATE_API_TOKEN"))


async def run_shell_cmd(cmd: str) -> dict[str, str]:
    """Executes a shell command and returns the output.
    Args:
        cmd: str, the shell command to execute.
    Returns:
        A dictionary with the status and output or error message.
    """
    import subprocess

    try:
        result = subprocess.run(
            cmd,
            shell=True,
            check=True,
            capture_output=True,
            text=True,
            cwd="./tmp",
        )
        return {"status": "success", "output": result.stdout, "error": result.stderr}
    except subprocess.CalledProcessError as e:
        return {"status": "error", "error": str(e)}
