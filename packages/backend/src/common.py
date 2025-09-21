from pathlib import Path
import tempfile

import requests


def s3_client():
    import boto3
    import os

    return boto3.client(
        "s3",
        endpoint_url="https://095f96ce70e75bbf88dea585b6a320a5.r2.cloudflarestorage.com",
        aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
        region_name="auto",
    )


async def url_to_temp_path(url: str) -> Path:
    res = requests.get(url)
    res.raise_for_status()
    with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as tmp_file:
        tmp_file.write(res.content)
        return Path(tmp_file.name)
