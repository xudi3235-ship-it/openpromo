import modal

# ---------- img ----------
image = (
    modal.Image.debian_slim(python_version="3.12.9")
    .run_commands(
        "apt update -y && apt install -y ffmpeg tree",
    )
    .pip_install_from_pyproject("pyproject.toml")
    .add_local_python_source(
        "src",
        ignore=[
            "__pycache__",
            "*.pyc",
            "tmp",
        ],
    )
)
secret = modal.Secret.from_name(
    "openpromo-secrets",
    required_keys=["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY"],
)

vols = {
    "/openpromo-bucket": modal.CloudBucketMount(
        bucket_name="openpromo-bucket",
        bucket_endpoint_url="https://095f96ce70e75bbf88dea585b6a320a5.r2.cloudflarestorage.com",
        secret=secret,
    )
}
