import modal

# ---------- img ----------
python_deps = [
    "fastapi[standard]",
    "scalar-fastapi",
    "requests",
    "boto3",
]
image = (
    modal.Image.debian_slim(python_version="3.11")
    .run_commands(
        "apt update -y && apt install -y ffmpeg",
    )
    .pip_install(*python_deps)
    .add_local_python_source("src")
)
secret = modal.Secret.from_name(
    "openpromo-secrets",
    required_keys=["CLOUDFLARE_R2_ACCESS_KEY_ID", "CLOUDFLARE_R2_SECRET_ACCESS_KEY"],
)

vols = {
    "/openpromo-bucket": modal.CloudBucketMount(
        bucket_name="openpromo-bucket",
        bucket_endpoint_url="https://095f96ce70e75bbf88dea585b6a320a5.r2.cloudflarestorage.com",
        secret=secret,
    )
}
