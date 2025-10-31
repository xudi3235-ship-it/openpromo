import modal

from src.api import fapi
from src.core.image_genai import test_product_shot_gen
from src.infra import image, secret, vols
from src.video import app as video_backend_app

app = modal.App(
    "openpromo-backend",
    image=image,
    secrets=[secret],
    volumes=vols,  # pyright: ignore[reportArgumentType]
)
app.include(video_backend_app)


# ---------- Modal fn ----------
@app.local_entrypoint()
def sdk():
    import json

    with open("openapi.json", "w") as f:
        json.dump(fapi.openapi(), f)


@app.function(image=image)
@modal.concurrent(max_inputs=100)
@modal.asgi_app(requires_proxy_auth=not modal.is_local)
def api():
    return fapi


@app.local_entrypoint()
def dev():
    from dotenv import load_dotenv

    load_dotenv()
    test_product_shot_gen()
    pass
