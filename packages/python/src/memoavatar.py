import modal
from utils import create_symlinks_recursive, sync_modal_vol
from pathlib import Path
import os
import torch
import logging

# NOTE: this example is not ready yet.
app = modal.App(name="memoavatar")
vol = modal.Volume.from_name("cache", create_if_missing=True)


def download_hf_model():
    from huggingface_hub import snapshot_download

    cache_dir = Path("/cache/memoavatar/pretrained_models")
    cache_dir.mkdir(parents=True, exist_ok=True)
    target_dir = Path("/memo/pretrained_models")
    target_dir.mkdir(parents=True, exist_ok=True)
    snapshot_download(
        "memoavatar/memo",
        local_dir=cache_dir,
    )
    create_symlinks_recursive(cache_dir, target_dir)


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
    .apt_install("ffmpeg", "git", "git-lfs", "wget", "clang")
    .run_commands("git clone https://github.com/memoavatar/memo")
    .workdir("/memo")
    .run_commands("pip install -e .")
    .run_function(download_hf_model, volumes={"/cache": vol}, gpu="L40S")
    .env({"MODEL_PATH": "/memo/pretrained_models"})
)


@app.cls(
    image=image,
    volumes={"/cache": vol},
    gpu="L40S",
    max_containers=1,
    timeout=60 * 60,  # 1 hr cuz we're rich as fuck ^_^
)
class MemoAvatarApi:
    @modal.enter()
    def enter(self):
        # Configure logging
        logging.basicConfig(level=logging.INFO)
        self.logger = logging.getLogger(__name__)

        # Create config from yaml
        config_str = """
        resolution: 512
        num_generated_frames_per_clip: 16
        fps: 30
        num_init_past_frames: 16
        num_past_frames: 16
        inference_steps: 20
        cfg_scale: 3.5
        weight_dtype: bf16
        enable_xformers_memory_efficient_attention: true
        model_name_or_path: /memo/pretrained_models
        vae: stabilityai/sd-vae-ft-mse
        wav2vec: facebook/wav2vec2-base-960h
        emotion2vec: iic/emotion2vec_plus_large
        misc_model_dir: /memo/pretrained_models
        """
        import yaml
        from omegaconf import OmegaConf  # type: ignore

        self.config = OmegaConf.create(yaml.safe_load(config_str))
        self.logger.info("Config loaded")
        self.logger.info(self.config)

        # Setup device and dtype
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        if self.config.weight_dtype == "fp16":
            self.weight_dtype = torch.float16
        elif self.config.weight_dtype == "bf16":
            self.weight_dtype = torch.bfloat16
        else:
            self.weight_dtype = torch.float32

        self.logger.info(f"Device: {self.device}, Weight dtype: {self.weight_dtype}")

        # Load models
        from diffusers import AutoencoderKL, FlowMatchEulerDiscreteScheduler  # type: ignore
        from diffusers.utils.import_utils import is_xformers_available  # type: ignore
        from memo.models.audio_proj import AudioProjModel  # type: ignore
        from memo.models.image_proj import ImageProjModel  # type: ignore
        from memo.models.unet_2d_condition import UNet2DConditionModel  # type: ignore
        from memo.models.unet_3d import UNet3DConditionModel  # type: ignore
        from memo.pipelines.video_pipeline import VideoPipeline  # type: ignore

        self.logger.info("Loading models...")

        self.logger.info("Loading VAE...")
        # Load VAE
        self.vae = AutoencoderKL.from_pretrained(self.config.vae).to(
            device=self.device, dtype=self.weight_dtype
        )

        # Load other models
        self.logger.info("Loading reference net...")
        self.reference_net = UNet2DConditionModel.from_pretrained(
            self.config.model_name_or_path,
            subfolder="reference_net",
            use_safetensors=True,
        )
        self.logger.info("Loading diffusion net...")
        self.diffusion_net = UNet3DConditionModel.from_pretrained(
            self.config.model_name_or_path,
            subfolder="diffusion_net",
            use_safetensors=True,
        )
        self.logger.info("Loading image proj...")
        self.image_proj = ImageProjModel.from_pretrained(
            self.config.model_name_or_path, subfolder="image_proj", use_safetensors=True
        )
        self.logger.info("Loading audio proj...")
        self.audio_proj = AudioProjModel.from_pretrained(
            self.config.model_name_or_path, subfolder="audio_proj", use_safetensors=True
        )

        # Set models to eval mode
        self.vae.requires_grad_(False).eval()
        self.reference_net.requires_grad_(False).eval()
        self.diffusion_net.requires_grad_(False).eval()
        self.image_proj.requires_grad_(False).eval()
        self.audio_proj.requires_grad_(False).eval()

        # Enable xformers if available
        if self.config.enable_xformers_memory_efficient_attention:
            if is_xformers_available():
                import xformers  # type: ignore

                self.reference_net.enable_xformers_memory_efficient_attention()
                self.diffusion_net.enable_xformers_memory_efficient_attention()
                self.logger.info("xFormers enabled for memory-efficient attention")
            else:
                self.logger.warning(
                    "xformers not available, falling back to standard attention"
                )

        # Create pipeline
        noise_scheduler = FlowMatchEulerDiscreteScheduler()
        self.pipeline = VideoPipeline(
            vae=self.vae,
            reference_net=self.reference_net,
            diffusion_net=self.diffusion_net,
            scheduler=noise_scheduler,
            image_proj=self.image_proj,
        )
        self.pipeline.to(device=self.device, dtype=self.weight_dtype)

        # Ensure face analysis and vocal separator models are available
        self._prepare_auxiliary_models()

        self.logger.info("Model initialization complete")

    def _prepare_auxiliary_models(self):
        """Ensure face analysis and vocal separator models are downloaded"""
        import os

        # Prepare face analysis models
        face_analysis = os.path.join(self.config.misc_model_dir, "misc/face_analysis")
        os.makedirs(os.path.join(face_analysis, "models"), exist_ok=True)

        for model in [
            "1k3d68.onnx",
            "2d106det.onnx",
            "face_landmarker_v2_with_blendshapes.task",
            "genderage.onnx",
            "glintr100.onnx",
            "scrfd_10g_bnkps.onnx",
        ]:
            model_path = os.path.join(face_analysis, "models", model)
            if not os.path.exists(model_path):
                self.logger.info(f"Downloading {model} to {face_analysis}/models")
                os.system(
                    f"wget -P {face_analysis}/models https://huggingface.co/memoavatar/memo/resolve/main/misc/face_analysis/models/{model}"
                )

        # Prepare vocal separator model
        vocal_separator = os.path.join(
            self.config.misc_model_dir, "misc/vocal_separator/Kim_Vocal_2.onnx"
        )
        if not os.path.exists(vocal_separator):
            self.logger.info(f"Downloading vocal separator to {vocal_separator}")
            os.makedirs(os.path.dirname(vocal_separator), exist_ok=True)
            os.system(
                f"wget -P {os.path.dirname(vocal_separator)} https://huggingface.co/memoavatar/memo/resolve/main/misc/vocal_separator/Kim_Vocal_2.onnx"
            )

    @modal.method()
    def infer(self, img_path, audio_path, seed=42):
        """
        Run inference using the MemoAvatar model

        Args:
            image_data: Bytes of the input image
            audio_data: Bytes of the input audio in WAV format
            seed: Random seed for generation

        Returns:
            Bytes of the output video
        """
        import tempfile
        import torch
        from tqdm import tqdm  # type: ignore
        from memo.utils.audio_utils import (  # type: ignore
            extract_audio_emotion_labels,
            preprocess_audio,
            resample_audio,
        )
        from memo.utils.vision_utils import preprocess_image, tensor_to_video  # type: ignore

        generator = torch.manual_seed(seed)

        # Create temporary files and directories
        with (
            tempfile.TemporaryDirectory() as temp_output_dir,
            tempfile.NamedTemporaryFile(suffix=".mp4") as temp_output_video,
        ):
            # Process image
            self.logger.info("Processing input image")
            img_size = (self.config.resolution, self.config.resolution)
            face_analysis = os.path.join(
                self.config.misc_model_dir, "misc/face_analysis"
            )
            pixel_values, face_emb = preprocess_image(
                face_analysis_model=face_analysis,
                image_path=img_path,
                image_size=self.config.resolution,
            )

            # Process audio
            self.logger.info("Processing input audio")
            cache_dir = os.path.join(temp_output_dir, "audio_preprocess")
            os.makedirs(cache_dir, exist_ok=True)

            resampled_audio_path = os.path.join(cache_dir, "input-16k.wav")
            resampled_audio_path = resample_audio(
                audio_path,
                resampled_audio_path,
            )

            vocal_separator = os.path.join(
                self.config.misc_model_dir, "misc/vocal_separator/Kim_Vocal_2.onnx"
            )
            audio_emb, audio_length = preprocess_audio(
                wav_path=resampled_audio_path,
                num_generated_frames_per_clip=self.config.num_generated_frames_per_clip,
                fps=self.config.fps,
                wav2vec_model=self.config.wav2vec,
                vocal_separator_model=vocal_separator,
                cache_dir=cache_dir,
                device=self.device,
            )

            # Process audio emotion
            self.logger.info("Processing audio emotion")
            audio_emotion, num_emotion_classes = extract_audio_emotion_labels(
                model="memoavatar/memo",
                wav_path=resampled_audio_path,
                emotion2vec_model=self.config.emotion2vec,
                audio_length=audio_length,
                device=self.device,
            )

            # Generate video frames
            self.logger.info("Generating video frames")
            video_frames = []
            num_clips = audio_emb.shape[0] // self.config.num_generated_frames_per_clip

            for t in range(num_clips):
                if len(video_frames) == 0:
                    # Initialize the first past frames with reference image
                    past_frames = pixel_values.repeat(
                        self.config.num_init_past_frames, 1, 1, 1
                    )
                    past_frames = past_frames.to(
                        dtype=pixel_values.dtype, device=pixel_values.device
                    )
                    pixel_values_ref_img = torch.cat([pixel_values, past_frames], dim=0)
                else:
                    past_frames = video_frames[-1][0]
                    past_frames = past_frames.permute(1, 0, 2, 3)
                    past_frames = past_frames[0 - self.config.num_past_frames :]
                    past_frames = past_frames * 2.0 - 1.0
                    past_frames = past_frames.to(
                        dtype=pixel_values.dtype, device=pixel_values.device
                    )
                    pixel_values_ref_img = torch.cat([pixel_values, past_frames], dim=0)

                pixel_values_ref_img = pixel_values_ref_img.unsqueeze(0)

                audio_tensor = (
                    audio_emb[
                        t * self.config.num_generated_frames_per_clip : min(
                            (t + 1) * self.config.num_generated_frames_per_clip,
                            audio_emb.shape[0],
                        )
                    ]
                    .unsqueeze(0)
                    .to(device=self.audio_proj.device, dtype=self.audio_proj.dtype)
                )
                audio_tensor = self.audio_proj(audio_tensor)

                audio_emotion_tensor = audio_emotion[
                    t * self.config.num_generated_frames_per_clip : min(
                        (t + 1) * self.config.num_generated_frames_per_clip,
                        audio_emb.shape[0],
                    )
                ]

                pipeline_output = self.pipeline(
                    ref_image=pixel_values_ref_img,
                    audio_tensor=audio_tensor,
                    audio_emotion=audio_emotion_tensor,
                    emotion_class_num=num_emotion_classes,
                    face_emb=face_emb,
                    width=img_size[0],
                    height=img_size[1],
                    video_length=self.config.num_generated_frames_per_clip,
                    num_inference_steps=self.config.inference_steps,
                    guidance_scale=self.config.cfg_scale,
                    generator=generator,
                    is_new_audio=t == 0,
                )

                video_frames.append(pipeline_output.videos)

            # Concatenate video frames and save
            video_frames = torch.cat(video_frames, dim=2)
            video_frames = video_frames.squeeze(0)
            video_frames = video_frames[:, :audio_length]

            tensor_to_video(
                video_frames,
                temp_output_video.name,
                resampled_audio_path,
                fps=self.config.fps,
            )

            # Read the output video as bytes
            temp_output_video.seek(0)
            output_video_bytes = temp_output_video.read()

            return output_video_bytes


@app.local_entrypoint()
def main():
    sync_modal_vol()
    MemoAvatarApi().infer.remote(
        img_path="/cache/inputs/ray.jpg",
        audio_path="/cache/inputs/jack_ma_speech_30s.mp3",
    )
    pass
