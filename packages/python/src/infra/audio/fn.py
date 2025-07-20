from pathlib import Path
import modal
import os
from typing import Any, Optional
from src.infra.audio.images import audio_enhance_image, spark_tts_image
from src.utils import get_logger, sync_modal_vol

vol = modal.Volume.from_name("cache", create_if_missing=True)
app = modal.App(name="promobase-audio")

logger = get_logger(__name__)


def hash_str(s: Any) -> str:
    if not isinstance(s, str):
        s = str(s)
    import hashlib

    return hashlib.md5(s.encode()).hexdigest()


@app.cls(
    image=spark_tts_image,
    volumes={"/cache": vol},
    gpu="L40S",
)
class SparkTTSApi:
    @modal.enter()
    def enter(self):
        import torch
        from cli.SparkTTS import SparkTTS  # type: ignore

        self.logger = get_logger(__name__)
        self.logger.info("Initializing TTS model...")
        device = torch.device("cuda")
        self.model = SparkTTS("pretrained_models/Spark-TTS-0.5B", device)
        pass

    @modal.method()
    def generate_tts_audio(
        self,
        text: str,
        prompt_speech_path: str,
        save_dir="example/results",
        prompt_text=None,
        gender=None,
        pitch=None,
        speed=None,
        segmentation_threshold=150,  # Do not go above this if you want to crash or you have better GPU
    ):
        """
        Generates TTS audio from input text, splitting into segments if necessary.

        Args:
            text (str): Input text for speech synthesis.
            model_dir (str): Path to the model directory.
            device (str): Device identifier (e.g., "cuda:0" or "cpu").
            prompt_speech_path (str, optional): Path to prompt audio for cloning.
            prompt_text (str, optional): Transcript of prompt audio.
            gender (str, optional): Gender parameter ("male"/"female").
            pitch (str, optional): Pitch parameter (e.g., "moderate").
            speed (str, optional): Speed parameter (e.g., "moderate").
            save_dir (str): Directory where generated audio will be saved.
            segmentation_threshold (int): Maximum number of words per segment.

        Returns:
            str: The unique file path where the generated audio is saved.
        """
        assert prompt_speech_path, "prompt_speech_path is required"
        logger.info(f"args: {text}, {prompt_speech_path}, {save_dir}")
        import os
        import torch
        import numpy as np
        import soundfile as sf
        import logging

        os.makedirs(save_dir, exist_ok=True)
        hash = hash_str(text)
        save_path = os.path.join(save_dir, f"{hash}.wav")

        # Check if the text is too long.
        words = text.split()
        if len(words) > segmentation_threshold:
            logging.info("Input text exceeds threshold; splitting into segments...")
            segments = [
                " ".join(words[i : i + segmentation_threshold])
                for i in range(0, len(words), segmentation_threshold)
            ]
            wavs = []
            for seg in segments:
                with torch.no_grad():
                    wav = self.model.inference(
                        seg,
                        prompt_speech_path,
                        prompt_text=prompt_text,
                        gender=gender,
                        pitch=pitch,
                        speed=speed,
                    )
                wavs.append(wav)
            final_wav = np.concatenate(wavs, axis=0)
        else:
            with torch.no_grad():
                final_wav = self.model.inference(
                    text,
                    prompt_speech_path,
                    prompt_text=prompt_text,
                    gender=gender,
                    pitch=pitch,
                    speed=speed,
                )

        # Save the generated audio.
        sf.write(save_path, final_wav, samplerate=16000)
        logging.info(f"Audio saved at: {save_path}")
        with open(save_path, "rb") as f:
            return f.read()

    @modal.method()
    def _infer(
        self,
        text: str,
        prompt_text: str,
        prompt_speech_path: str,
        save_dir: str,
        gender: Optional[str] = None,
        pitch: Optional[str] = None,
        speed: Optional[str] = None,
    ):
        import os
        import torch
        import soundfile as sf
        from datetime import datetime
        import sys
        import shutil

        # Add the spark_tts directory to the Python path
        sys.path.append("/spark_tts")

        # Import the SparkTTS class
        from cli.SparkTTS import SparkTTS  # type: ignore

        model_dir = os.environ["SPARK_TTS_MODEL_PATH"]
        assert os.path.exists(model_dir), f"Model directory {model_dir} does not exist"

        # Clean up save_dir
        if os.path.exists(save_dir):
            shutil.rmtree(save_dir)
        os.makedirs(save_dir, exist_ok=True)

        # Initialize device
        device = torch.device("cuda:0")

        # Initialize the model
        model = SparkTTS(model_dir, device)

        # Generate unique filename using timestamp
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        save_path = os.path.join(save_dir, f"{timestamp}.wav")

        # Perform inference
        with torch.no_grad():
            wav = model.inference(
                text,
                prompt_speech_path,
                prompt_text=prompt_text,
                gender=gender,
                pitch=pitch,
                speed=speed,
            )
            sf.write(save_path, wav, samplerate=16000)

        # Read the generated audio file and return its content
        with open(save_path, "rb") as f:
            return f.read()


@app.function(image=audio_enhance_image, volumes={"/cache": vol}, gpu="L40S")
def enhance_audio(
    url: str | None = None,
    in_bytes: bytes | None = None,
    solver: str = "euler",
    nfe: int = 64,
    tau: float = 0.5,
    denoising: bool = False,
):
    """
    file: audio file to process
    solver: midpoint, rk4, euler. midpoint preferred
    nfe: higher values better quality but maybe slower, [1,128]
    tau: cfm prior temporature, [0,1]，higher better quality but less stable
    denoising: deonise or not?
    """
    logger = get_logger(__name__)
    with audio_enhance_image.imports():
        from subprocess import run
        from pathlib import Path
        import torch

        # Create input and output directories
        in_dir = Path("in_dir")
        out_dir = Path("out_dir")
        in_dir.mkdir(exist_ok=True)
        out_dir.mkdir(exist_ok=True)

        if url is None and in_bytes is None:
            raise ValueError("Either url or in_bytes must be provided")

        # Determine file extension from URL or default to wav
        if url:
            import re

            ext_match = re.search(r"\.([a-zA-Z0-9]+)(?:\?.*)?$", url)
            ext = f".{ext_match.group(1).lower()}" if ext_match else ".wav"
        else:
            # Default extension for binary input
            ext = ".wav"
        if ext != ".wav":
            raise ValueError("Only .wav files are supported")

        fname = f"input{ext}"
        input_file = in_dir / fname
        output_file = out_dir / fname
        if url:
            run(f"wget {url} -O {input_file}", shell=True, check=True)
        if in_bytes:
            with open(input_file, "wb") as f:
                f.write(in_bytes)

        if not input_file.exists() or input_file.stat().st_size == 0:
            raise FileNotFoundError("Downloaded file is missing or empty.")
        logger.info("Downloaded audio file")
        device = "cuda" if torch.cuda.is_available() else "cpu"

        run_dir = os.environ.get("RESEMBLE_ENHANCE_RUN_DIR")

        denoise_flag = "--denoise" if denoising else ""
        run_command = f"resemble-enhance {in_dir} {out_dir} --solver {solver} --nfe {nfe} --tau {tau} {denoise_flag} --device {device}"

        if run_dir:
            run_command += f" --run_dir {run_dir}"
        logger.info(f"Running command: {run_command}")
        run(run_command, shell=True, check=True)

        if not output_file.exists():
            raise FileNotFoundError("Enhanced audio file is missing.")

        if output_file.stat().st_size == 0:
            raise ValueError("Enhanced audio file is empty.")
        logger.info("Enhanced audio file created")
        with open(output_file, "rb") as f:
            return f.read()


@app.local_entrypoint()
def main():
    with open("tmp/script.txt", "r") as f:
        text = f.read()
    texts = text.split("\n")
    texts = [t for t in texts if t.strip()]
    sync_modal_vol()
    prompt_speech_path = "/cache/inputs/trump_joerogan_trump_only_30s.mp3"
    inputs = [(t, prompt_speech_path) for t in texts]
    logger.info(f"inputs: {inputs}")
    fn = SparkTTSApi().generate_tts_audio
    i = 0
    bufs = []
    for buf in fn.starmap(inputs):
        bufs.append(buf)
        with open(f"{i}.wav", "wb") as f:
            f.write(buf)
            i += 1
    inputs = [(None, buf) for buf in bufs]
    i = 0
    for buf in enhance_audio.starmap(inputs):
        with open(f"{i}.enhanced.wav", "wb") as f:
            f.write(buf)
            i += 1
    # with open("tmp/trump_spark_tts_enhanced.wav", "wb") as f:
    #     f.write(buf)
