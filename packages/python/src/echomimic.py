from pathlib import Path
from typing import Optional
import modal
from utils import create_symlinks_recursive


app = modal.App(name="echomimic")
vol = modal.Volume.from_name("cache", create_if_missing=True)


def download_echomimic_pretrained_weights():
    """
    shared fn to download pretrained weights for v1
    """
    import logging
    import os
    import subprocess
    from pathlib import Path
    import shutil
    import yaml
    from huggingface_hub import hf_hub_download, snapshot_download

    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger(__name__)

    logger.info(f"running fn {__name__}")
    cache_dir = Path("/cache/echomimic/pretrained_weights")
    if cache_dir.exists():
        shutil.rmtree(cache_dir)
        os.makedirs(cache_dir, exist_ok=True)
    target_dir = Path("/echomimic/pretrained_weights")
    os.makedirs(target_dir, exist_ok=True)

    # Download individual files from the main repository
    files = [
        "denoising_unet.pth",
        "denoising_unet_acc.pth",
        "denoising_unet_pose.pth",
        "denoising_unet_pose_acc.pth",
        "face_locator.pth",
        "face_locator_pose.pth",
        "motion_module.pth",
        "motion_module_acc.pth",
        "motion_module_pose.pth",
        "motion_module_pose_acc.pth",
        "reference_unet.pth",
        "reference_unet_pose.pth",
    ]

    for f in files:
        m = hf_hub_download(
            repo_id="BadToBest/EchoMimic", filename=f, cache_dir=cache_dir
        )
        logger.info(f"Downloaded {f} to {m}")
        os.symlink(m, target_dir / f)

    # Download sd-vae-ft-mse using snapshot_download
    vae_target_dir = target_dir / "sd-vae-ft-mse"
    os.makedirs(vae_target_dir, exist_ok=True)
    cache_vae_path = Path("/cache/echomimic/pretrained_weights/sd-vae-ft-mse")

    vae_repo = snapshot_download(
        repo_id="stabilityai/sd-vae-ft-mse",
        cache_dir=cache_dir,
        local_dir=cache_vae_path,
        ignore_patterns=["*.git*", "*.md"],
    )
    logger.info(f"Downloaded sd-vae-ft-mse to {vae_repo}")

    create_symlinks_recursive(cache_vae_path, vae_target_dir)

    # Download sd-image-variations-diffusers using snapshot_download
    diffusers_target_dir = target_dir / "sd-image-variations-diffusers"
    os.makedirs(diffusers_target_dir, exist_ok=True)
    cache_diffusers_path = Path(
        "/cache/echomimic/pretrained_weights/sd-image-variations-diffusers"
    )

    diffusers_repo = snapshot_download(
        repo_id="lambdalabs/sd-image-variations-diffusers",
        cache_dir=cache_dir,
        local_dir=cache_diffusers_path,
        ignore_patterns=["*.git*", "*.md"],
    )
    logger.info(f"Downloaded sd-image-variations-diffusers to {diffusers_repo}")

    create_symlinks_recursive(cache_diffusers_path, diffusers_target_dir)

    # Download audio processor
    audio_processor_dir = target_dir / "audio_processor"
    os.makedirs(audio_processor_dir, exist_ok=True)
    audio_processor_cache_path = Path(
        "/cache/echomimic/pretrained_weights/audio_processor"
    )
    os.makedirs(audio_processor_cache_path, exist_ok=True)

    audio_model_path = audio_processor_cache_path / "whisper_tiny.pt"
    subprocess.run(
        f"wget https://openaipublic.azureedge.net/main/whisper/models/65147644a518d12f04e32d6f3b26facc3f8dd46e5390956a9424a650c0ce22b9/tiny.pt -O {audio_model_path}",
        shell=True,
        check=True,
    )
    logger.info(f"Downloaded whisper tiny.pt to {audio_model_path}")

    # Create symlink to the audio model
    audio_dest_path = audio_processor_dir / "whisper_tiny.pt"
    if audio_dest_path.exists():
        if audio_dest_path.is_symlink():
            audio_dest_path.unlink()
        else:
            os.remove(audio_dest_path)
    os.symlink(audio_model_path, audio_dest_path)

    # List all files in the target directory to verify
    all_files = list(Path(target_dir).rglob("*"))
    logger.info(f"Found {len(all_files)} files in the repository")

    # iterate all .yaml files within /configs/prompts folder and update relative paths to absolute paths
    for infer_yaml_path in Path("/echomimic/configs/prompts").rglob("*.yaml"):
        logger.info(f"Updating config file at {infer_yaml_path} with absolute paths")
        try:
            with open(infer_yaml_path, "r") as f:
                config = yaml.safe_load(f)

            # Update all relative paths to absolute paths
            for key in config:
                if isinstance(config[key], str) and config[key].startswith(
                    "./pretrained_weights/"
                ):
                    # Replace relative path with absolute path to the symlinked directory
                    config[key] = config[key].replace(
                        "./pretrained_weights/", "/echomimic/pretrained_weights/"
                    )
                    logger.info(f"Updated {key}: {config[key]}")

            # Save the updated config
            with open(infer_yaml_path, "w") as f:
                yaml.dump(config, f, default_flow_style=False)
                logger.info(f"Updated config file at {infer_yaml_path}")

            # Log the updated config for verification
            with open(infer_yaml_path, "r") as f:
                logger.info(f"Updated config:\n{f.read()}")

        except Exception as e:
            logger.error(f"Error updating config file: {str(e)}")

    # Verify installation with a directory listing
    subprocess.run(f"ls -al {target_dir}", shell=True, check=True)


def download_echomimic_pretrained_weights_v2(is_v2=True):
    """
    shared fn to download pretrained weights for v1 and v2 of
    echomimic
    """
    import logging
    import os
    import subprocess
    from pathlib import Path
    import shutil
    import yaml

    from huggingface_hub import hf_hub_download

    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger(__name__)

    logger.info(f"running fn {__name__} with args - is_v2: {is_v2}")

    # specified in the repo
    files = [
        "denoising_unet.pth",
        "denoising_unet_acc.pth",
        "motion_module.pth",
        "motion_module_acc.pth",
        "pose_encoder.pth",
        "reference_unet.pth",
    ]
    proj = "echomimic_v2" if is_v2 else "echomimic"
    cache_dir = Path(f"/cache/{proj}")
    # FIXME: force cleanup
    if cache_dir.exists():
        shutil.rmtree(cache_dir)
        os.makedirs(cache_dir, exist_ok=True)
    # weights_dir = cache_dir / "weights"
    target_dir = Path(f"/{proj}/pretrained_weights")

    os.makedirs(target_dir, exist_ok=True)

    repo_id = "BadToBest/EchoMimicV2"
    for f in files:
        m = hf_hub_download(repo_id=repo_id, filename=f, cache_dir=cache_dir)
        logger.info(f"Downloaded {f} to {m}")
        os.symlink(m, target_dir / f)

    # download sd-vae-ft-mse
    vae_target_dir = target_dir / "sd-vae-ft-mse"
    os.makedirs(vae_target_dir, exist_ok=True)
    cache_vae_path = Path(f"/cache/{proj}/pretrained_weights/sd-vae-ft-mse")
    if not cache_vae_path.exists():
        subprocess.run(
            f"git clone https://huggingface.co/stabilityai/sd-vae-ft-mse {cache_vae_path}",
            shell=True,
            check=True,
        )
        logger.info(f"Downloaded sd-vae-ft-mse to {cache_vae_path}")

        for item in cache_vae_path.iterdir():
            dest_path = vae_target_dir / item.name
            if dest_path.exists():
                if dest_path.is_symlink():
                    dest_path.unlink()
                elif dest_path.is_dir():
                    shutil.rmtree(dest_path)
                else:
                    os.remove(dest_path)
            os.symlink(item, dest_path)

    # download sd-image-variations-diffusers
    diffusers_target_dir = target_dir / "sd-image-variations-diffusers"
    os.makedirs(diffusers_target_dir, exist_ok=True)
    cache_diffusers_path = Path(
        f"/cache/{proj}/pretrained_weights/sd-image-variations-diffusers"
    )
    if not cache_diffusers_path.exists():
        subprocess.run(
            f"git clone https://huggingface.co/lambdalabs/sd-image-variations-diffusers {cache_diffusers_path}",
            shell=True,
            check=True,
        )
        logger.info(
            f"Downloaded sd-image-variations-diffusers to {cache_diffusers_path}"
        )
        for item in cache_diffusers_path.iterdir():
            dest_path = diffusers_target_dir / item.name
            if dest_path.exists():
                if dest_path.is_symlink():
                    dest_path.unlink()
                elif dest_path.is_dir():
                    shutil.rmtree(dest_path)
                else:
                    os.remove(dest_path)
            os.symlink(item, dest_path)
            logger.info(f"Symlinked {item} to {dest_path}")

    # download audio processor
    audio_processor_dir = target_dir / "audio_processor"
    os.makedirs(audio_processor_dir, exist_ok=True)
    audio_processor_cache_path = Path(
        f"/cache/{proj}/pretrained_weights/audio_processor"
    )
    os.makedirs(audio_processor_cache_path, exist_ok=True)

    audio_model_path = audio_processor_cache_path / "tiny.pt"
    if not audio_model_path.exists():
        subprocess.run(
            f"wget https://openaipublic.azureedge.net/main/whisper/models/65147644a518d12f04e32d6f3b26facc3f8dd46e5390956a9424a650c0ce22b9/tiny.pt -O {audio_model_path}",
            shell=True,
            check=True,
        )
        logger.info(f"Downloaded whisper tiny.pt to {audio_model_path}")

    # Create symlink to the downloaded file
    dest_path = audio_processor_dir / "tiny.pt"
    if dest_path.exists():
        if dest_path.is_symlink():
            dest_path.unlink()
        else:
            os.remove(dest_path)
    os.symlink(audio_model_path, dest_path)

    # iterate all .yaml files within /configs/prompts folder and update relative paths to absolute paths
    for infer_yaml_path in Path(f"/{proj}/configs/prompts").rglob("*.yaml"):
        logger.info(f"Updating config file at {infer_yaml_path} with absolute paths")
        try:
            with open(infer_yaml_path, "r") as f:
                config = yaml.safe_load(f)

            # Update all relative paths to absolute paths
            for key in config:
                if isinstance(config[key], str) and config[key].startswith(
                    "./pretrained_weights/"
                ):
                    # Replace relative path with absolute path to the symlinked directory
                    config[key] = config[key].replace(
                        "./pretrained_weights/", f"/{proj}/pretrained_weights/"
                    )
                    logger.info(f"Updated {key}: {config[key]}")

            # Save the updated config
            with open(infer_yaml_path, "w") as f:
                yaml.dump(config, f, default_flow_style=False)

            logger.info("Config file updated successfully")

            # Log the updated config for verification
            with open(infer_yaml_path, "r") as f:
                logger.info(f"Updated config:\n{f.read()}")

        except Exception as e:
            logger.error(f"Error updating config file: {str(e)}")


echomimic_img = (
    modal.Image.debian_slim(python_version="3.10")
    .run_commands("apt-get update && apt-get install ffmpeg libsm6 libxext6  -y")
    .apt_install(["git", "git-lfs", "wget", "xz-utils"])
    # had to downgrade to < 0.26.0 otherwise it's failing
    .pip_install("huggingface_hub[hf_transfer]==0.25.2")
    .env({"HF_HUB_ENABLE_HF_TRANSFER": "1"})
    .run_commands(["git clone https://github.com/antgroup/echomimic"])
    .workdir("/echomimic")
    # ffmpeg static
    .run_commands(
        [
            "wget https://www.johnvansickle.com/ffmpeg/old-releases/ffmpeg-4.4-amd64-static.tar.xz &&  tar -xf ffmpeg-4.4-amd64-static.tar.xz --strip-components=1 && rm ffmpeg-4.4-amd64-static.tar.xz && export FFMPEG_PATH=$(pwd)",
        ]
    )
    .env({"FFMPEG_PATH": "/echomimic"})
    .run_commands(
        [
            "pip install pip -U",
            # pin the versions
            "pip install torch==2.2.2 torchvision==0.17.2 torchaudio==2.2.2 mediapipe transformers==4.38.2 diffusers==0.24.0 torchmetrics torchtyping tqdm ffmpeg-python==0.2.0 facenet_pytorch==2.5.0 moviepy==1.0.3 einops==0.4.1 omegaconf==2.3.0 opencv-python av==11.0.0 gradio huggingface_hub==0.25.2 accelerate",
        ]
    )
    .run_function(download_echomimic_pretrained_weights, volumes={"/cache": vol})
    .add_local_python_source("deploy", "tts", "utils")
)
# echomimic_v2_img = (
#     modal.Image.debian_slim(python_version="3.10")
#     .run_commands("apt-get update && apt-get install ffmpeg libsm6 libxext6  -y")
#     .apt_install(["git", "git-lfs", "wget", "xz-utils"])
#     .pip_install("huggingface_hub[hf_transfer]==0.26.2")
#     .env({"HF_HUB_ENABLE_HF_TRANSFER": "1"})
#     .run_commands(["git clone https://github.com/antgroup/echomimic_v2"])
#     .workdir("/echomimic_v2")
#     # ffmepg static
#     .run_commands(
#         [
#             "wget https://www.johnvansickle.com/ffmpeg/old-releases/ffmpeg-4.4-amd64-static.tar.xz &&  tar -xf ffmpeg-4.4-amd64-static.tar.xz --strip-components=1 && rm ffmpeg-4.4-amd64-static.tar.xz && export FFMPEG_PATH=$(pwd)",
#         ]
#     )
#     .env({"FFMPEG_PATH": "/echomimic_v2"})
#     .run_commands(
#         [
#             "pip install pip -U",
#             "pip install torch==2.5.1 torchvision==0.20.1 torchaudio==2.5.1 xformers==0.0.28.post3 --index-url https://download.pytorch.org/whl/cu124",
#             "pip install torchao --index-url https://download.pytorch.org/whl/nightly/cu124",
#             "pip install -r requirements.txt",
#             "pip install --no-deps facenet_pytorch==2.6.0",
#         ]
#     )
#     .run_function(download_echomimic_pretrained_weights, volumes={"/cache": vol})
#     .add_local_python_source("deploy", "tts")
# )


@app.cls(
    gpu="A100",
    cpu=4,
    memory=8192,
    image=echomimic_img,
    volumes={"/cache": vol},
    max_containers=1,
    timeout=60 * 60 * 2,  # 2 hours
)
class EchoMimicApi:
    @modal.enter()
    def enter(self):
        """Initialize models and resources when the class is instantiated"""
        import os
        import platform
        import subprocess
        import torch
        from diffusers import AutoencoderKL, DDIMScheduler  # type: ignore
        from omegaconf import OmegaConf  # type: ignore
        from facenet_pytorch import MTCNN  # type: ignore
        from src.models.unet_2d_condition import UNet2DConditionModel  # type: ignore
        from src.models.unet_3d_echo import EchoUNet3DConditionModel  # type: ignore
        from src.models.whisper.audio2feature import load_audio_model  # type: ignore
        from src.pipelines.pipeline_echo_mimic_acc import Audio2VideoPipeline  # type: ignore
        from src.models.face_locator import FaceLocator  # type: ignore

        # Configure ffmpeg path
        ffmpeg_path = os.getenv("FFMPEG_PATH")
        if ffmpeg_path is not None and ffmpeg_path not in os.getenv("PATH", ""):
            os.environ["PATH"] = f"{ffmpeg_path}:{os.environ['PATH']}"

        # Store for later use
        self.torch = torch
        self.OmegaConf = OmegaConf

        # Default configuration path
        default_config_path = "/echomimic/configs/prompts/animation_acc.yaml"
        config = OmegaConf.load(default_config_path)
        self.config = self.patch_config(config)
        print(f"loaded config: {self.config}")

        # Configure weight type
        self.weight_dtype = (
            torch.float16 if self.config.weight_dtype == "fp16" else torch.float32
        )
        self.device = "cuda" if torch.cuda.is_available() else "cpu"

        # Load inference configuration
        inference_config_path = self.config.inference_config
        self.infer_config = OmegaConf.load(inference_config_path)

        # Initialize models
        print("Initializing models...")
        subprocess.run(
            "ls -al /cache/inputs/echomimic/inputs",
            shell=True,
            check=True,
        )

        # VAE init
        self.vae = AutoencoderKL.from_pretrained(
            self.config.pretrained_vae_path,
        ).to(self.device, dtype=self.weight_dtype)

        # Reference unet init
        self.reference_unet = UNet2DConditionModel.from_pretrained(
            self.config.pretrained_base_model_path,
            subfolder="unet",
        ).to(dtype=self.weight_dtype, device=self.device)
        self.reference_unet.load_state_dict(
            torch.load(self.config.reference_unet_path, map_location="cpu"),
        )

        # Denoising unet init
        if os.path.exists(self.config.motion_module_path):
            # Stage1 + stage2
            self.denoising_unet = EchoUNet3DConditionModel.from_pretrained_2d(
                self.config.pretrained_base_model_path,
                self.config.motion_module_path,
                subfolder="unet",
                unet_additional_kwargs=self.infer_config.unet_additional_kwargs,
            ).to(dtype=self.weight_dtype, device=self.device)
        else:
            # Only stage1
            self.denoising_unet = EchoUNet3DConditionModel.from_pretrained_2d(
                self.config.pretrained_base_model_path,
                "",
                subfolder="unet",
                unet_additional_kwargs={
                    "use_motion_module": False,
                    "unet_use_temporal_attention": False,
                    "cross_attention_dim": self.infer_config.unet_additional_kwargs.cross_attention_dim,
                },
            ).to(dtype=self.weight_dtype, device=self.device)

        self.denoising_unet.load_state_dict(
            torch.load(self.config.denoising_unet_path, map_location="cpu"),
            strict=False,
        )

        # Face locator init
        self.face_locator = FaceLocator(
            320, conditioning_channels=1, block_out_channels=(16, 32, 96, 256)
        ).to(dtype=self.weight_dtype, device=self.device)
        self.face_locator.load_state_dict(torch.load(self.config.face_locator_path))

        # Audio processor init
        self.audio_processor = load_audio_model(
            model_path=self.config.audio_model_path, device=self.device
        )

        # Face detector init
        self.face_detector = MTCNN(
            image_size=320,
            margin=0,
            min_face_size=20,
            thresholds=[0.6, 0.7, 0.7],
            factor=0.709,
            post_process=True,
            device=self.device,
        )

        # Initialize scheduler
        sched_kwargs = OmegaConf.to_container(self.infer_config.noise_scheduler_kwargs)
        self.scheduler = DDIMScheduler(**sched_kwargs)

        # Initialize pipeline
        self.pipe = Audio2VideoPipeline(
            vae=self.vae,
            reference_unet=self.reference_unet,
            denoising_unet=self.denoising_unet,
            audio_guider=self.audio_processor,
            face_locator=self.face_locator,
            scheduler=self.scheduler,
        ).to(self.device, dtype=self.weight_dtype)

        print("Model initialization complete")

    def patch_config(self, config):
        # update all relative paths to absolute paths
        if "pretrained_weights" in config:
            config["pretrained_weights"] = config["pretrained_weights"].replace(
                "./pretrained_weights/", "/echomimic/pretrained_weights/"
            )
        return config

    def select_face(self, det_bboxes, probs):
        """Select the largest face with probability > 0.8"""
        if det_bboxes is None or probs is None:
            return None

        filtered_bboxes = []
        for bbox_i in range(len(det_bboxes)):
            if probs[bbox_i] > 0.8:
                filtered_bboxes.append(det_bboxes[bbox_i])

        if len(filtered_bboxes) == 0:
            return None

        sorted_bboxes = sorted(
            filtered_bboxes, key=lambda x: (x[3] - x[1]) * (x[2] - x[0]), reverse=True
        )
        return sorted_bboxes[0]

    @modal.method()
    def infer(
        self,
        ref_image_path: str,
        audio_path: str,
        output_path: Optional[str] = None,
        width: int = 512,
        height: int = 512,
        max_frames: int = 1200,
        seed: int = 420,
        cfg_scale: float = 2.5,
        steps: int = 30,
        sample_rate: int = 16000,
        fps: int = 24,
        face_mask_dilation: float = 0.1,
        face_crop_dilation: float = 0.5,
        context_frames: int = 12,
        context_overlap: int = 3,
        include_audio: bool = True,
    ):
        """
        Generate a talking face video from a reference image and audio file.

        Args:
            ref_image_path: Path to the reference image
            audio_path: Path to the audio file
            output_path: Path to save the output video (optional)
            width: Width of the output video
            height: Height of the output video
            max_frames: Maximum number of frames to generate
            seed: Random seed for generation
            cfg_scale: Guidance scale for the diffusion model
            steps: Number of diffusion steps
            sample_rate: Audio sample rate
            fps: Frames per second of the output video
            face_mask_dilation: Dilation ratio for the face mask
            face_crop_dilation: Dilation ratio for the face crop
            context_frames: Number of context frames
            context_overlap: Number of frames to overlap between contexts
            include_audio: Whether to include audio in the output video

        Returns:
            Path to the generated video
        """
        import os
        import random
        import cv2
        import numpy as np
        from datetime import datetime
        from pathlib import Path
        from PIL import Image  # type: ignore
        from moviepy.editor import VideoFileClip, AudioFileClip  # type: ignore
        from src.utils.util import save_videos_grid, crop_and_pad  # type: ignore

        if seed is not None and seed > -1:
            generator = self.torch.manual_seed(seed)
        else:
            generator = self.torch.manual_seed(random.randint(100, 1000000))

        # Create output directory if needed
        if output_path is None:
            date_str = datetime.now().strftime("%Y%m%d")
            time_str = datetime.now().strftime("%H%M")
            save_dir_name = f"{time_str}--seed_{seed}-{width}x{height}"
            save_dir = Path(f"/tmp/echomimic_output/{date_str}/{save_dir_name}")
            save_dir.mkdir(exist_ok=True, parents=True)

            ref_name = Path(ref_image_path).stem
            audio_name = Path(audio_path).stem
            output_path = f"{save_dir}/{ref_name}_{audio_name}_{height}x{width}_{int(cfg_scale)}_{time_str}.mp4"
        else:
            save_dir = Path(output_path).parent
            save_dir.mkdir(exist_ok=True, parents=True)

        # Face mask preparation
        face_img = cv2.imread(ref_image_path)
        face_mask = np.zeros((face_img.shape[0], face_img.shape[1])).astype("uint8")

        det_bboxes, probs = self.face_detector.detect(face_img)
        select_bbox = self.select_face(det_bboxes, probs)

        if select_bbox is None:
            face_mask[:, :] = 255
        else:
            xyxy = select_bbox[:4]
            xyxy = np.round(xyxy).astype("int")
            rb, re, cb, ce = xyxy[1], xyxy[3], xyxy[0], xyxy[2]
            r_pad = int((re - rb) * face_mask_dilation)
            c_pad = int((ce - cb) * face_mask_dilation)
            face_mask[rb - r_pad : re + r_pad, cb - c_pad : ce + c_pad] = 255

            # Face crop
            r_pad_crop = int((re - rb) * face_crop_dilation)
            c_pad_crop = int((ce - cb) * face_crop_dilation)
            crop_rect = [
                max(0, cb - c_pad_crop),
                max(0, rb - r_pad_crop),
                min(ce + c_pad_crop, face_img.shape[1]),
                min(re + r_pad_crop, face_img.shape[0]),
            ]
            print(f"Cropping face to: {crop_rect}")
            face_img, _ = crop_and_pad(face_img, crop_rect)
            face_mask, _ = crop_and_pad(face_mask, crop_rect)
            face_img = cv2.resize(face_img, (width, height))
            face_mask = cv2.resize(face_mask, (width, height))

        ref_image_pil = Image.fromarray(face_img[:, :, [2, 1, 0]])
        face_mask_tensor = (
            self.torch.Tensor(face_mask)
            .to(dtype=self.weight_dtype, device=self.device)
            .unsqueeze(0)
            .unsqueeze(0)
            .unsqueeze(0)
            / 255.0
        )

        # Generate the video
        video = self.pipe(
            ref_image_pil,
            audio_path,
            face_mask_tensor,
            width,
            height,
            max_frames,
            steps,
            cfg_scale,
            generator=generator,
            audio_sample_rate=sample_rate,
            context_frames=context_frames,
            fps=fps,
            context_overlap=context_overlap,
        ).videos

        temp_output = output_path
        save_videos_grid(
            video,
            temp_output,
            n_rows=1,
            fps=fps,
        )

        # Add audio if requested
        if include_audio:
            audio_output = output_path.replace(".mp4", "_withaudio.mp4")
            video_clip = VideoFileClip(temp_output)
            audio_clip = AudioFileClip(audio_path)
            video_clip = video_clip.set_audio(audio_clip)
            video_clip.write_videofile(audio_output, codec="libx264", audio_codec="aac")
            with open(audio_output, "rb") as f:
                audio_output = f.read()
                return audio_output

        # return video bytes
        with open(temp_output, "rb") as f:
            temp_output = f.read()
            return temp_output


# @app.function(gpu="L40S", image=echomimic_img, volumes={"/cache": vol})
# def echomimic_infer():
#     from subprocess import run

#     # run("ls -al ./pretrained_weights", shell=True, check=True)
#     run("cat ./configs/prompts/animation.yaml", shell=True)
#     # run("python infer_audio2vid.py", shell=True, check=True)
#     # run("ls -al /cache/echomimic/pretrained_weights/sd-vae-ft-mse/", shell=True)
#     # FIXME: symlink is not working -- not seeing in the pretrained_weights dir...
#     # run("ls -al ./pretrained_weights/sd-vae-ft-mse/", shell=True)
#     raise NotImplementedError("Not implemented")


# @app.function(gpu="L40S", image=echomimic_v2_img, volumes={"/cache": vol})
# def echomimic_v2_infer():
#     from subprocess import run

#     # run("ls -al ./pretrained_weights", shell=True)
#     # run("cat ./configs/prompts/infer.yaml", shell=True)

#     run("python infer.py --config='./configs/prompts/infer.yaml'", shell=True)
#     raise NotImplementedError("Not implemented")


@app.local_entrypoint()
def main():
    # EchoMimic V1 is a image2video generation.
    # LatentSync is a video2video generation.
    # here's the steps needed
    # 1. prepare a ref image
    # 2. use high quality tts api to gen audio
    # 3. invoke this fn to stitch them.

    def get_img_dim(p):
        import cv2

        img = cv2.imread(str(p))
        return img.shape[1], img.shape[0]

    local_input_dir = Path("./tmp")
    remote_input_dir = Path("/inputs/echomimic/inputs")
    ref_img = "ray.jpg"
    audio = "in.wav"
    width, height = get_img_dim(local_input_dir / ref_img)
    print(f"img dim: {width}x{height}")
    with vol.batch_upload(force=True) as batch:
        batch.put_directory(local_input_dir, remote_input_dir)
        print("committed")
    for f in vol.iterdir("/inputs/echomimic/inputs"):
        print(f)
    api = EchoMimicApi()
    out_buf = api.infer.remote(
        ref_image_path=f"/cache/{remote_input_dir}/{ref_img}",
        audio_path=f"/cache/{remote_input_dir}/{audio}",
        width=width,
        height=height,
        fps=24,
        cfg_scale=2.5,
    )
    with open("tmp/echomimic_output.mp4", "wb") as f:
        f.write(out_buf)
