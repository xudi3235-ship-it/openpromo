def get_duration(file_path) -> float:
    import json
    import subprocess

    cmd = [
        "ffprobe",
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "json",
        file_path,
    ]
    try:
        result = subprocess.run(
            cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=True
        )
        data = json.loads(result.stdout)
        return float(data["format"]["duration"])
    except (
        subprocess.CalledProcessError,
        KeyError,
        ValueError,
        json.JSONDecodeError,
    ) as e:
        raise RuntimeError(f"Failed to get duration for file '{file_path}': {e}")
