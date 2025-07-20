import modal
from fastapi import FastAPI, File, HTTPException, UploadFile
from src.infra.storage import r2_secret, bucket

fapi = FastAPI()
app = modal.App("api")

kv = modal.Dict.from_name("kv", create_if_missing=True)
q = modal.Queue.from_name("q", create_if_missing=True)

secrets = modal.Secret.from_name("openpromo-secrets")


image = modal.Image.debian_slim().pip_install(
    "fastapi[all]",
    "boto3",
    "replicate",
)


def get_s3_client():
    import boto3
    import os

    return boto3.client(
        "s3",
        endpoint_url="https://1e0c4549002673e844b2c215fd7237f5.r2.cloudflarestorage.com",
        aws_access_key_id=os.environ.get("AWS_ACCESS_KEY_ID"),
        aws_secret_access_key=os.environ.get("AWS_SECRET_ACCESS_KEY"),
    )


@fapi.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    raise NotImplementedError("to be tested")
    import os
    import uuid

    try:
        s3 = get_s3_client()

        # Generate a unique filename to avoid collisions
        file_extension = os.path.splitext(file.filename)[1] if file.filename else ""
        unique_filename = f"{uuid.uuid4()}{file_extension}"

        # Read file content
        contents = await file.read()

        # Upload to R2 bucket
        s3.put_object(
            Bucket="openpromo-public",
            Key=unique_filename,
            Body=contents,
            ContentType=file.content_type,
        )

        # Generate public URL
        file_url = f"https://openpromo-public.1e0c4549002673e844b2c215fd7237f5.r2.cloudflarestorage.com/{unique_filename}"

        return {"success": True, "filename": unique_filename, "url": file_url}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@fapi.get("/api/download/{filename}")
async def download_file(filename: str):
    raise NotImplementedError("to be tested")
    from fastapi.responses import StreamingResponse
    import io

    try:
        s3 = get_s3_client()

        # Get the object from R2 bucket
        response = s3.get_object(Bucket="openpromo-public", Key=filename)

        # Get content and content type
        content = response["Body"].read()
        content_type = response.get("ContentType", "application/octet-stream")

        # Create a stream from the content
        stream = io.BytesIO(content)

        # Return a streaming response with the correct content type
        return StreamingResponse(
            stream,
            media_type=content_type,
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )

    except Exception as e:
        raise HTTPException(status_code=404, detail=f"File not found: {str(e)}")


@fapi.post("/api/webhooks/replicate")
def replicate_webhook(item: dict):
    raise NotImplementedError("handle async prediction")


func_attrs = {
    "image": image,
    "secrets": [r2_secret, secrets],
    "volumes": {"/openpromo-public": bucket},
}


@app.function(**func_attrs)
@modal.asgi_app()
def api():
    return fapi
