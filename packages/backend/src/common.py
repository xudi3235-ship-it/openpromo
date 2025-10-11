from dataclasses import dataclass
from enum import Enum
from pathlib import Path
import tempfile

import requests


def s3_client():
    import boto3
    import os

    return boto3.client(
        "s3",
        endpoint_url="https://095f96ce70e75bbf88dea585b6a320a5.r2.cloudflarestorage.com",
        aws_access_key_id=os.environ["CLOUDFLARE_R2_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["CLOUDFLARE_R2_SECRET_ACCESS_KEY"],
        region_name="auto",
    )


async def url_to_temp_path(url: str) -> Path:
    res = requests.get(url)
    res.raise_for_status()
    with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as tmp_file:
        tmp_file.write(res.content)
        return Path(tmp_file.name)


class EphemeralCadence(str, Enum):
    HOURLY = "hourly"
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"


@dataclass
class R2Utils:
    bucket_mount_path: Path = Path("/openpromo-bucket")

    @staticmethod
    def cp(
        src: Path, dest_key: str, cadence: EphemeralCadence = EphemeralCadence.HOURLY
    ) -> tuple[Path, str]:
        import shutil

        cadence_dir = Path("ephemeral") / cadence.value
        dest_path = R2Utils.bucket_mount_path / cadence_dir / dest_key
        dest_path.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy(src, dest_path)
        return dest_path, str(cadence_dir / dest_key)

    @staticmethod
    def gen_presigned_url(key: str, expires_in: int = 3600) -> str:
        client = s3_client()
        return client.generate_presigned_url(
            "get_object",
            Params={"Bucket": "openpromo-bucket", "Key": key},
            ExpiresIn=expires_in,
        )
