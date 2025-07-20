import modal
from typing import Union, BinaryIO
import numpy as np
from pathlib import Path

image = (
    modal.Image.from_registry(
        "nvidia/cuda:12.3.2-cudnn9-devel-ubuntu22.04",
        add_python="3.11",
        setup_dockerfile_commands=[
            "RUN apt update",
            "ENV DEBIAN_FRONTEND=noninteractive DEBCONF_NONINTERACTIVE_SEEN=true",
            "RUN apt install software-properties-common -y",
            "RUN add-apt-repository ppa:deadsnakes/ppa",
            "RUN apt install python3.11 python3-pip -y",
            "RUN apt install python-is-python3 -y",
        ],
    )
    .run_commands("pip install faster-whisper", gpu="L40S")
    .pip_install("pydantic", "python-dotenv")
)

app = modal.App("promobase-faster-whisper")
vol = modal.Volume.from_name("cache", create_if_missing=True)


@app.cls(image=image, volumes={"/cache": vol}, gpu="L40S")
class FasterWhisperApi:
    @modal.enter()
    def enter(self):
        with image.imports():
            from faster_whisper import WhisperModel

            model_size = "turbo"
            device = "cuda"
            self.model = WhisperModel(model_size, device=device)

    @modal.method()
    def infer(
        self,
        audio: Union[str, BinaryIO, np.ndarray],
        **kwargs,
    ):
        segments, info = self.model.transcribe(
            audio,
            beam_size=5,
            **kwargs,
        )
        return list(segments), info


def sync_modal_vol():
    local_input_dir = Path("./tmp")
    remote_input_dir = Path("/inputs/echomimic/inputs")
    with vol.batch_upload(force=True) as batch:
        batch.put_directory(local_input_dir, remote_input_dir)


@app.local_entrypoint()
def main():
    audio_path = "/cache/inputs/echomimic/inputs/in.wav"
    sync_modal_vol()
    seg, _ = FasterWhisperApi().infer.remote(audio_path)
    orig_txt = "很多人在问我说TraderJoe的课程到底怎么样。我只能说，上过的都拿到offer了。没上过的全都是弱智。"
    print(seg)
    pass
