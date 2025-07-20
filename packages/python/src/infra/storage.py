import modal


r2_secret = modal.Secret.from_name(
    "r2-secret", required_keys=["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY"]
)

bucket = modal.CloudBucketMount(
    bucket_name="openpromo-public",
    bucket_endpoint_url="https://1e0c4549002673e844b2c215fd7237f5.r2.cloudflarestorage.com",
    secret=r2_secret,
)
