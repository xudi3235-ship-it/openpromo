import modal
from src.common.replicate_infra import ReplicateInfra

app = modal.App("promobase-replicate")
vol = modal.Volume.from_name("cache", create_if_missing=True)
image = modal.Image.debian_slim(python_version="3.11").pip_install("replicate")
# some distributed stuff
kv = modal.Dict.from_name("kv", create_if_missing=True)
q = modal.Queue.from_name("q", create_if_missing=True)


@app.cls(
    image=image,
    volumes={"/cache": vol},
    secrets=[modal.Secret.from_name("openpromo-secrets")],
)
class ReplicateApi:
    @modal.enter()
    def enter(self):
        self.api = ReplicateInfra()

    @modal.method()
    def infer(self):
        raise NotImplementedError("infer method not implemented")


@app.local_entrypoint()
def main():
    ReplicateApi()
