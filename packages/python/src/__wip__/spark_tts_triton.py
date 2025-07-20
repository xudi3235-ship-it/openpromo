import modal
from pathlib import Path
import os
from typing import Optional

vol = modal.Volume.from_name("cache", create_if_missing=True)
app = modal.App(name="spark_tts_triton")
# TODO: this example is NOT ready -- productionize to use triton is non-trivial
# i don't think we need it for now.
# a good example is https://github.com/ai-bot-pro/achatbot
image = (
    modal.Image.from_registry(
        "nvcr.io/nvidia/tritonserver:25.02-trtllm-python-py3", add_python="3.12"
    )
    .apt_install(
        "tree",
        "git",
        "git-lfs",
        "cmake",
        "rapidjson-dev",
        "libarchive-dev",
        "zlib1g-dev",
    )
    .run_commands(
        "cmake --version",  # cmake>=3.17
        "python --version",
        "mkdir -p /stub",
        "git clone https://github.com/triton-inference-server/python_backend -b r25.02",
        "cd python_backend && mkdir build",
        "cd /python_backend/build && cmake -DPYBIND11_FINDPYTHON=ON -DPYTHON_EXECUTABLE=$(which python) -DTRITON_ENABLE_GPU=ON -DTRITON_BACKEND_REPO_TAG=r25.02 -DTRITON_COMMON_REPO_TAG=r25.02 -DTRITON_CORE_REPO_TAG=r25.02 -DCMAKE_INSTALL_PREFIX:PATH=/stub/ .. && make triton-python-backend-stub",
    )
    .run_commands(
        "git clone https://github.com/SparkAudio/Spark-TTS.git /workspace/Spark-TTS",
        "pip install -r /workspace/Spark-TTS/requirements.txt",
    )
    .pip_install("tensorrt-llm")
)


def download_and_build_model():
    """
    Download model and build TensorRT-LLM engines, saving everything to cache
    so future runs will be much faster.
    """
    from huggingface_hub import snapshot_download
    import shutil
    import subprocess
    import os

    # Create cache directory
    cache_dir = Path("/cache/spark_tts/pretrained_models/Spark-TTS-0.5B")
    cache_dir.mkdir(parents=True, exist_ok=True)

    # Setup paths for TensorRT-LLM
    trt_dtype = "bfloat16"
    trt_weights_dir = Path(f"/cache/spark_tts/tllm_checkpoint_{trt_dtype}")
    trt_engines_dir = Path(f"/cache/spark_tts/trt_engines_{trt_dtype}")
    model_repo_template = Path("/cache/spark_tts/model_repo")
    model_repo_configured = Path("/cache/spark_tts/model_repo_configured")

    # Create directories if they don't exist
    trt_weights_dir.mkdir(parents=True, exist_ok=True)
    trt_engines_dir.mkdir(parents=True, exist_ok=True)
    model_repo_template.mkdir(parents=True, exist_ok=True)
    model_repo_configured.mkdir(parents=True, exist_ok=True)

    # Download model if needed
    if not cache_dir.exists() or not any(cache_dir.iterdir()):
        print("Downloading Spark-TTS-0.5B from HuggingFace...")
        snapshot_download(
            "SparkAudio/Spark-TTS-0.5B",
            local_dir=cache_dir,
        )
        print("Model download complete")
    else:
        print("Using cached model files")

    # Copy necessary scripts
    shutil.copy(
        "/workspace/Spark-TTS/runtime/triton_trtllm/scripts/convert_checkpoint.py",
        "/cache/spark_tts/convert_checkpoint.py",
    )

    # Create template model repo directory if needed
    if model_repo_template.exists():
        shutil.rmtree(model_repo_template)
    model_repo_template.mkdir(parents=True, exist_ok=True)
    shutil.copytree(
        "/workspace/Spark-TTS/runtime/triton_trtllm/model_repo",
        model_repo_template,
        dirs_exist_ok=True,
    )

    # Convert checkpoint to TensorRT weights if needed
    if not trt_weights_dir.exists() or not any(trt_weights_dir.iterdir()):
        print("Converting checkpoint to TensorRT weights...")
        trt_weights_dir.mkdir(parents=True, exist_ok=True)
        subprocess.run(
            [
                "python",
                "/cache/spark_tts/convert_checkpoint.py",
                "--model_dir",
                f"{cache_dir}/LLM",
                "--output_dir",
                str(trt_weights_dir),
                "--dtype",
                trt_dtype,
            ],
            check=True,
        )
        print("Conversion complete")
    else:
        print("Using cached TensorRT weights")

    # Build TensorRT engines if needed
    if not trt_engines_dir.exists() or not any(trt_engines_dir.iterdir()):
        print("Building TensorRT-LLM engines (this may take a while)...")
        trt_engines_dir.mkdir(parents=True, exist_ok=True)
        subprocess.run(
            [
                "trtllm-build",
                "--checkpoint_dir",
                str(trt_weights_dir),
                "--output_dir",
                str(trt_engines_dir),
                "--max_batch_size",
                "16",
                "--max_num_tokens",
                "32768",
                "--gemm_plugin",
                trt_dtype,
            ],
            check=True,
        )
        print("Engine build complete")
    else:
        print("Using cached TensorRT engines")

    # Pre-configure model repository
    if model_repo_configured.exists():
        shutil.rmtree(model_repo_configured)
    model_repo_configured.mkdir(parents=True, exist_ok=True)

    # Copy components to the configured repo
    os.makedirs(model_repo_configured, exist_ok=True)
    shutil.copytree(
        f"{model_repo_template}/spark_tts", f"{model_repo_configured}/spark_tts"
    )
    shutil.copytree(
        f"{model_repo_template}/audio_tokenizer",
        f"{model_repo_configured}/audio_tokenizer",
    )
    shutil.copytree(
        f"{model_repo_template}/tensorrt_llm", f"{model_repo_configured}/tensorrt_llm"
    )
    shutil.copytree(
        f"{model_repo_template}/vocoder", f"{model_repo_configured}/vocoder"
    )

    # Fill templates
    MAX_QUEUE_DELAY_MICROSECONDS = "0"
    BLS_INSTANCE_NUM = "4"
    TRITON_MAX_BATCH_SIZE = "16"
    DECOUPLED_MODE = "False"
    LLM_TOKENIZER_DIR = f"{cache_dir}/LLM"

    # Fill vocoder template
    subprocess.run(
        [
            "python3",
            "/workspace/Spark-TTS/runtime/triton_trtllm/scripts/fill_template.py",
            "-i",
            f"{model_repo_configured}/vocoder/config.pbtxt",
            f"model_dir:{cache_dir},triton_max_batch_size:{TRITON_MAX_BATCH_SIZE},max_queue_delay_microseconds:{MAX_QUEUE_DELAY_MICROSECONDS}",
        ],
        check=True,
    )

    # Fill audio_tokenizer template
    subprocess.run(
        [
            "python3",
            "/workspace/Spark-TTS/runtime/triton_trtllm/scripts/fill_template.py",
            "-i",
            f"{model_repo_configured}/audio_tokenizer/config.pbtxt",
            f"model_dir:{cache_dir},triton_max_batch_size:{TRITON_MAX_BATCH_SIZE},max_queue_delay_microseconds:{MAX_QUEUE_DELAY_MICROSECONDS}",
        ],
        check=True,
    )

    # Fill spark_tts template
    subprocess.run(
        [
            "python3",
            "/workspace/Spark-TTS/runtime/triton_trtllm/scripts/fill_template.py",
            "-i",
            f"{model_repo_configured}/spark_tts/config.pbtxt",
            f"bls_instance_num:{BLS_INSTANCE_NUM},llm_tokenizer_dir:{LLM_TOKENIZER_DIR},triton_max_batch_size:{TRITON_MAX_BATCH_SIZE},max_queue_delay_microseconds:{MAX_QUEUE_DELAY_MICROSECONDS}",
        ],
        check=True,
    )

    # Fill tensorrt_llm template
    subprocess.run(
        [
            "python3",
            "/workspace/Spark-TTS/runtime/triton_trtllm/scripts/fill_template.py",
            "-i",
            f"{model_repo_configured}/tensorrt_llm/config.pbtxt",
            f"triton_backend:tensorrtllm,triton_max_batch_size:{TRITON_MAX_BATCH_SIZE},decoupled_mode:{DECOUPLED_MODE},max_beam_width:1,engine_dir:{trt_engines_dir},max_tokens_in_paged_kv_cache:2560,max_attention_window_size:2560,kv_cache_free_gpu_mem_fraction:0.5,exclude_input_in_output:True,enable_kv_cache_reuse:False,batching_strategy:inflight_fused_batching,max_queue_delay_microseconds:{MAX_QUEUE_DELAY_MICROSECONDS},encoder_input_features_data_type:TYPE_FP16,logits_datatype:TYPE_FP32",
        ],
        check=True,
    )

    print("Model repository configuration complete")


# Add download_and_build_model to the image
image = image.run_function(
    download_and_build_model, volumes={"/cache": vol}, gpu="L40S"
)


@app.cls(
    image=image,
    volumes={"/cache": vol},
    gpu="L40S",
)
class SparkTTSTritonApi:
    @modal.enter()
    def enter(self):
        import os
        import subprocess
        import time
        import threading
        from tritonclient.grpc import service_pb2, service_pb2_grpc  # type: ignore
        import grpc  # type: ignore

        # Setup environment
        os.environ["CUDA_VISIBLE_DEVICES"] = "0"

        # Paths
        self.model_dir = "/cache/spark_tts/pretrained_models/Spark-TTS-0.5B"
        self.trt_dtype = "bfloat16"
        self.trt_engines_dir = f"/cache/spark_tts/trt_engines_{self.trt_dtype}"
        self.model_repo = "/cache/spark_tts/model_repo_configured"

        # Validate that our preconfigured model repo exists
        if not os.path.exists(self.model_repo) or not os.listdir(self.model_repo):
            raise RuntimeError(
                f"Preconfigured model repository not found at {self.model_repo}"
            )

        # Start Triton server in background thread
        def start_triton_server():
            subprocess.run(["tritonserver", "--model-repository", self.model_repo])

        self.server_thread = threading.Thread(target=start_triton_server)
        self.server_thread.daemon = True
        self.server_thread.start()

        # Wait for server to start
        print("Waiting for Triton server to start...")
        time.sleep(10)  # Initial wait

        # Create gRPC client
        max_retries = 30
        retry_count = 0
        while retry_count < max_retries:
            try:
                channel = grpc.insecure_channel("localhost:8001")
                self.grpc_stub = service_pb2_grpc.GRPCInferenceServiceStub(channel)
                # Test connection
                request = service_pb2.ServerLiveRequest()
                response = self.grpc_stub.ServerLive(request)
                if response.live:
                    print("Triton server is live and ready!")
                    break
            except Exception as e:
                print(
                    f"Server not ready yet, waiting... ({retry_count + 1}/{max_retries})"
                )
                time.sleep(2)
                retry_count += 1

        if retry_count >= max_retries:
            raise RuntimeError(
                "Failed to connect to Triton server after multiple attempts"
            )

    @modal.method()
    def generate_tts_audio(
        self,
        text: str,
        prompt_speech_path: Optional[str] = None,
        prompt_text: Optional[str] = None,
        gender: Optional[str] = None,
        pitch: Optional[str] = None,
        speed: Optional[str] = None,
    ):
        """
        Generates TTS audio using the Triton server with TensorRT-LLM acceleration.

        Args:
            text (str): Input text for speech synthesis.
            prompt_speech_path (str, optional): Path to prompt audio for cloning.
            prompt_text (str, optional): Transcript of prompt audio.
            gender (str, optional): Gender parameter ("male"/"female").
            pitch (str, optional): Pitch parameter (e.g., "moderate").
            speed (str, optional): Speed parameter (e.g., "moderate").

        Returns:
            bytes: The generated audio as bytes.
        """
        import numpy as np
        import soundfile as sf
        import tritonclient.grpc as grpcclient  # type: ignore
        import tempfile
        import os

        # Setup Triton client
        client = grpcclient.InferenceServerClient(url="localhost:8001")

        # Handle reference audio if provided
        reference_audio_bytes = None
        if prompt_speech_path and os.path.exists(prompt_speech_path):
            with open(prompt_speech_path, "rb") as f:
                reference_audio_bytes = f.read()

        # Prepare inputs
        inputs = []

        # Add text input
        text_input = grpcclient.InferInput("TEXT", [1], "BYTES")
        text_input.set_data_from_numpy(np.array([text.encode()], dtype=np.object_))
        inputs.append(text_input)

        # Add reference text input if available
        if prompt_text:
            ref_text_input = grpcclient.InferInput("REFERENCE_TEXT", [1], "BYTES")
            ref_text_input.set_data_from_numpy(
                np.array([prompt_text.encode()], dtype=np.object_)
            )
            inputs.append(ref_text_input)

        # Add reference audio input if available
        if reference_audio_bytes:
            ref_audio_input = grpcclient.InferInput("REFERENCE_AUDIO", [1], "BYTES")
            ref_audio_input.set_data_from_numpy(
                np.array([reference_audio_bytes], dtype=np.object_)
            )
            inputs.append(ref_audio_input)

        # Add gender input if specified
        if gender:
            gender_input = grpcclient.InferInput("GENDER", [1], "BYTES")
            gender_input.set_data_from_numpy(
                np.array([gender.encode()], dtype=np.object_)
            )
            inputs.append(gender_input)

        # Add pitch input if specified
        if pitch:
            pitch_input = grpcclient.InferInput("PITCH", [1], "BYTES")
            pitch_input.set_data_from_numpy(
                np.array([pitch.encode()], dtype=np.object_)
            )
            inputs.append(pitch_input)

        # Add speed input if specified
        if speed:
            speed_input = grpcclient.InferInput("SPEED", [1], "BYTES")
            speed_input.set_data_from_numpy(
                np.array([speed.encode()], dtype=np.object_)
            )
            inputs.append(speed_input)

        # Define outputs
        outputs = [grpcclient.InferRequestedOutput("AUDIO")]

        # Send request
        response = client.infer(model_name="spark_tts", inputs=inputs, outputs=outputs)

        # Get audio bytes from response
        audio_bytes = response.as_numpy("AUDIO")[0]

        # Write audio to a temporary file and read it back as bytes
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=True) as tmp:
            # Convert audio bytes to wav file
            audio_array = np.frombuffer(audio_bytes, dtype=np.int16)
            sf.write(tmp.name, audio_array, 16000)

            # Read the wav file back as bytes
            with open(tmp.name, "rb") as f:
                return f.read()


@app.local_entrypoint()
def main():
    text = "各位好，这里是TraderJoe，今天想给大家聊聊SnT求职的事情。"

    # Reading prompt text
    prompt_text_path = os.path.join("tmp", "transcript.txt")
    if os.path.exists(prompt_text_path):
        with open(prompt_text_path, "r") as f:
            prompt_text = f.read()
            print(f"Using prompt text: {prompt_text[:100]}...")
    else:
        prompt_text = "吃燕窝就选燕之屋，本节目由26年专注高品质燕窝的燕之屋冠名播出。"
        print(f"Using default prompt text: {prompt_text}")

    # Get reference audio path
    prompt_speech_path = "/cache/inputs/jack_ma_speech_30s.mp3"
    # Generate audio
    print("Generating TTS audio...")
    try:
        buf = SparkTTSTritonApi().generate_tts_audio.remote(
            text,
            prompt_speech_path=prompt_speech_path,
            prompt_text=prompt_text,
        )

        # Save output
        output_path = os.path.join("tmp", "spark_tts_triton_output.wav")
        with open(output_path, "wb") as f:
            f.write(buf)

        print(f"Audio saved to {output_path}")
    except Exception as e:
        print(f"Error generating audio: {e}")
        raise
