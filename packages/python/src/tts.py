from typing import Literal
import modal

import os
from pathlib import Path


def download_resemble_fn():
    """Download and cache the Resemble enhance model to the mounted volume"""
    import logging
    import subprocess

    REPO_URL = "https://huggingface.co/ResembleAI/resemble-enhance"
    # Store in the Modal volume instead of the default package location
    REPO_DIR = Path("/cache/resemble_model")

    logger = logging.getLogger(__name__)

    logger.info("Downloading the Resemble model to cache...")

    if REPO_DIR.exists() and (REPO_DIR / ".git").exists():
        logger.info("Repository already exists, attempting to pull latest changes...")
        subprocess.run(
            ["git", "-C", str(REPO_DIR), "pull"],
            check=True,
            env={**os.environ, "GIT_LFS_SKIP_SMUDGE": "1"},
        )
    else:
        logger.info("Cloning the repository...")
        os.makedirs(REPO_DIR, exist_ok=True)
        subprocess.run(
            ["git", "clone", REPO_URL, str(REPO_DIR)],
            check=True,
            env={**os.environ, "GIT_LFS_SKIP_SMUDGE": "1"},
        )

    logger.info("Pulling large files...")
    subprocess.run(["git", "-C", str(REPO_DIR), "lfs", "pull"], check=True)

    logger.info("Model download completed")


def download_2noise_hf_fn():
    """Download and cache the ChatTTS model to the mounted volume"""
    import logging
    import os
    from pathlib import Path
    from huggingface_hub import snapshot_download

    logger = logging.getLogger(__name__)

    logger.info("Downloading the ChatTTS model to cache...")

    # Create base cache directory
    cache_dir = Path("/cache/2noise")
    os.makedirs(cache_dir, exist_ok=True)

    # This will download into a structure that matches how ChatTTS expects files
    # The expected path will be something like:
    # /cache/2noise/models--2Noise--ChatTTS/snapshots/{snapshot_hash}/...
    try:
        download_path = snapshot_download(
            repo_id="2Noise/ChatTTS",
            allow_patterns=["*.yaml", "*.json", "*.safetensors"],
            cache_dir=cache_dir,
            force_download=False,
        )
        logger.info(f"ChatTTS model downloaded to: {download_path}")
    except Exception as e:
        logger.error(f"Error downloading ChatTTS model: {str(e)}")
        raise


vol = modal.Volume.from_name("cache", create_if_missing=True)
app = modal.App(name="tts")

image = (
    modal.Image.debian_slim(python_version="3.10")
    .apt_install(["wget", "git", "git-lfs"])
    # install resemble-enhance
    .pip_install("resemble-enhance")
    .run_function(download_resemble_fn, volumes={"/cache": vol})
    .env({"RESEMBLE_ENHANCE_RUN_DIR": "/cache/resemble_model/enhancer_stage2"})
    # install chat-tts
    .pip_install("ChatTTS")
    .run_function(download_2noise_hf_fn, volumes={"/cache": vol})
    .env({"CHAT_TTS_MODEL_PATH": "/cache/2noise/chattts"})
    .run_commands("pip install WeTextProcessing nemo_text_processing")
    .add_local_python_source("deploy")
)


@app.cls(image=image, volumes={"/cache": vol}, gpu="L40S")
class TTSPipeline:
    @modal.enter()
    def enter(self):
        with image.imports():
            import ChatTTS
            import torch
            import logging
            from typing import Callable
            from functools import partial

            def normalizer_en_nemo_text() -> Callable[[str], str]:
                from nemo_text_processing.text_normalization.normalize import Normalizer  # type: ignore

                return partial(
                    Normalizer(input_case="cased", lang="en").normalize,
                    verbose=False,
                    punct_post_process=True,
                )

            def normalizer_zh_tn() -> Callable[[str], str]:
                from tn.chinese.normalizer import Normalizer  # type: ignore

                return Normalizer(remove_interjections=False).normalize

            self.logger = logging.getLogger(__name__)

            torch._dynamo.config.cache_size_limit = 64  # type: ignore
            torch._dynamo.config.suppress_errors = True  # type: ignore
            torch.set_float32_matmul_precision("high")
            import os

            if os.path.exists("outputs"):
                os.rmdir("outputs")
            os.makedirs("outputs", exist_ok=True)

            custom_path = os.environ.get("CHAT_TTS_MODEL_PATH")
            chat = ChatTTS.Chat()
            chat.load("huggingface", compile=False, custom_path=custom_path)
            try:
                chat.normalizer.register("en", normalizer_en_nemo_text())
            except ValueError as e:
                self.logger.error(e)
            except:  # noqa: E722
                self.logger.warning("Package nemo_text_processing not found!")

            try:
                chat.normalizer.register("zh", normalizer_zh_tn())
            except ValueError as e:
                self.logger.error(e)
            except:  # noqa: E722
                self.logger.warning("Package WeTextProcessing not found!")
            self.chat = chat
            # use oral_(0-9), laugh_(0-2), break_(0-7)
            # to generate special token in text to synthesize.

    @modal.method()
    def tts(
        self,
        text: str,
        skip_refine_text: bool = False,
        voice: Literal[2222, 7869, 6653, 4099, 5099] | int = 2222,
        temperature: float = 0.3,
        top_k: int = 20,
        top_p: float = 0.7,
        custom_voice: int = 0,
    ):
        import torchaudio
        import torch
        import io
        import ChatTTS

        if custom_voice > 0:
            voice = custom_voice

        print(f"{voice=},{custom_voice=}")

        torch.manual_seed(voice)
        rand_spk = self.chat.sample_random_speaker()

        params_infer_code = ChatTTS.Chat.InferCodeParams(
            spk_emb=rand_spk,  # add sampled speaker
            temperature=temperature,  # using custom temperature
            top_P=top_p,  # top P decode
            top_K=top_k,  # top K decode
            prompt="[speed_5]",
        )
        # use oral_(0-9), laugh_(0-2), break_(0-7)
        # to generate special token in text to synthesize.
        params_refine_text = ChatTTS.Chat.RefineTextParams(
            prompt="[oral_2][laugh_0][break_6]",
        )

        texts = [t for t in text.split("\n") if t.strip()]
        print(f"{texts=}")
        wavs = self.chat.infer(
            text=texts,
            use_decoder=True,
            skip_refine_text=skip_refine_text,
            params_refine_text=params_refine_text,
            params_infer_code=params_infer_code,
            do_text_normalization=True,  # TODO: figure out wtf is this
        )

        wav_tensors = []  # List to store tensor versions of wavs

        for i in range(len(wavs)):  # type: ignore
            """
            In some versions of torchaudio, the first line works but in other versions, so does the second line.
            """
            try:
                torchaudio.save(  # type: ignore
                    f"outputs/basic_output{i}.wav",
                    torch.from_numpy(wavs[i]).unsqueeze(0),  # type: ignore
                    24000,
                )
                print(f"basic_output{i}.wav saved with shape {wavs[i].shape}")  # type: ignore
            except:  # noqa: E722
                torchaudio.save(  # type: ignore
                    f"outputs/basic_output{i}.wav",
                    torch.from_numpy(wavs[i]),  # type: ignore
                    24000,
                )
            # Convert NumPy array to PyTorch tensor and append to wav_tensors
            wav_tensors.append(torch.from_numpy(wavs[i]))  # type: ignore

        # Concatenate all tensors
        combined_tensor = torch.cat(wav_tensors, dim=0)
        # Post-process the combined tensor
        enhanced_tensor = self.podcast_audio_postprocess(combined_tensor.unsqueeze(0))

        # Convert the tensor to bytes using an in-memory buffer
        buffer = io.BytesIO()
        # torchaudio.save(buffer, combined_tensor.unsqueeze(0), 24000, format="wav")
        torchaudio.save(buffer, enhanced_tensor, 24000, format="wav")
        buffer.seek(0)
        buf = buffer.read()
        # enhance audio
        wav_bytes = self.enhance_audio.local(in_bytes=buf)

        return wav_bytes

    @modal.method()
    def enhance_audio(
        self,
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
        with image.imports():
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
            # Download the file into the input directory
            fname = "input.wav"
            input_file = in_dir / fname
            output_file = out_dir / fname
            if url:
                run(f"wget {url} -O {input_file}", shell=True, check=True)
            if in_bytes:
                with open(input_file, "wb") as f:
                    f.write(in_bytes)

            if not input_file.exists() or input_file.stat().st_size == 0:
                raise FileNotFoundError("Downloaded file is missing or empty.")
            self.logger.info("Downloaded audio file")
            device = "cuda" if torch.cuda.is_available() else "cpu"

            run_dir = os.environ.get("RESEMBLE_ENHANCE_RUN_DIR")

            denoise_flag = "--denoise" if denoising else ""
            run_command = f"resemble-enhance {in_dir} {out_dir} --solver {solver} --nfe {nfe} --tau {tau} {denoise_flag} --device {device}"

            if run_dir:
                run_command += f" --run_dir {run_dir}"
            run(run_command, shell=True, check=True)

            if not output_file.exists() or output_file.stat().st_size == 0:
                raise FileNotFoundError("Enhanced audio file is missing or empty.")
            self.logger.info("Enhanced audio file created")

            with open(output_file, "rb") as f:
                return f.read()

    def podcast_audio_postprocess(
        self,
        waveform,
        sample_rate=24000,
    ):
        import torchaudio.functional as F
        import torch

        # 1. High-pass filter to remove sub-bass rumble
        waveform = F.highpass_biquad(waveform, sample_rate=sample_rate, cutoff_freq=80)

        # 2. SM7B-inspired EQ profile with preamp coloration
        # Add proximity effect boost (deep bass presence like SM7B)
        waveform = F.equalizer_biquad(
            waveform, sample_rate, center_freq=120, gain=6.0, Q=0.8
        )

        # Add warmth and body (low-mids)
        waveform = F.equalizer_biquad(
            waveform, sample_rate, center_freq=250, gain=4.0, Q=0.7
        )

        # Subtle presence boost (for clarity)
        waveform = F.equalizer_biquad(
            waveform, sample_rate, center_freq=3000, gain=2.0, Q=0.8
        )

        # Cut nasal tones / harshness
        waveform = F.equalizer_biquad(
            waveform, sample_rate, center_freq=1200, gain=-4.5, Q=1.2
        )

        # Roll off excessive highs (like SM7B's natural roll-off)
        waveform = F.equalizer_biquad(
            waveform, sample_rate, center_freq=8000, gain=-3.0, Q=0.7
        )

        # 3. Subtle compression (simulating preamp)
        threshold = 0.5
        ratio = 3.0
        attack = 5.0  # ms
        release = 50.0  # ms

        # Simple compression implementation
        abs_waveform = torch.abs(waveform)
        gain_mask = abs_waveform > threshold
        gain_reduction = torch.zeros_like(waveform)
        gain_reduction[gain_mask] = (abs_waveform[gain_mask] - threshold) * (
            1 - 1 / ratio
        )

        # Apply smooth attack/release (simplified)
        compressed = waveform - torch.sign(waveform) * gain_reduction

        # 4. Add subtle harmonic saturation (tube preamp simulation)
        drive = 0.2
        saturation = torch.tanh(compressed * (1 + drive)) / (1 + drive * 0.5)

        # 5. Normalize to -1dB peak (leaving headroom)
        peak = saturation.abs().max()
        if peak > 0:
            target_peak = 0.89  # -1dB peak
            saturation = saturation * (target_peak / peak)

        return saturation


@app.local_entrypoint()
def main():
    cls = TTSPipeline()
    txt = """wip
"""
    buf = cls.tts.remote(text=txt, skip_refine_text=True)
    with open("tmp/spark_tts_output.wav", "wb") as f:
        f.write(buf)
    # audio_bytes = b""
    # with open("tmp/spark_tts_output.wav", "rb") as f:
    #     audio_bytes = f.read()
    # buf = TTSPipeline().enhance_audio.remote(in_bytes=audio_bytes)
    # with open("tmp/enhanced_output.wav", "wb") as f:
    #     f.write(buf)
