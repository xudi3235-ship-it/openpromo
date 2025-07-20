from dataclasses import dataclass
from pathlib import Path
from typing import Literal, Optional
import modal
from src.infra.video.images import (
    latent_sync_image,
    muse_talk_image,
    hunyuan_i2v_image,
    magi_image,
    ltx_video_image,
)
from src.utils import get_logger, sync_modal_vol, StrPath
from src.common.ffmpeg import get_duration

app = modal.App(name="promobase-video")
vol = modal.Volume.from_name("cache")
logger = get_logger(__name__)


@dataclass
class LatentSyncConfig:
    video_path: str = "assets/demo1_video.mp4"
    audio_path: str = "assets/demo1_audio.wav"
    video_out_path: str = "video_out.mp4"
    unet_config_path: str = "configs/unet/stage2.yaml"
    inference_ckpt_path: str = "checkpoints/latentsync_unet.pt"
    inference_steps: int = 20  # [20, 50] higher is slower but better quality
    guidance_scale: float = 1.5  # [1.0, 3.0] higher is more lip-sync accurate but might cause distortion or jitter
    seed: int = 1247


@app.cls(
    image=latent_sync_image, volumes={"/cache": vol}, gpu="L40S", timeout=60 * 60 * 2
)
class LatentSyncApi:
    @modal.enter()
    def enter(self):
        args: LatentSyncConfig = LatentSyncConfig()
        logger.info(f"Using config: {args}")
        with latent_sync_image.imports():
            # ref https://github.com/bytedance/LatentSync/blob/main/scripts/inference.py
            import os
            from omegaconf import OmegaConf  # type: ignore
            import torch
            from diffusers import AutoencoderKL, DDIMScheduler  # type: ignore
            from latentsync.models.unet import UNet3DConditionModel  # type: ignore
            from latentsync.pipelines.lipsync_pipeline import LipsyncPipeline  # type: ignore
            from accelerate.utils import set_seed  # type: ignore
            from latentsync.whisper.audio2feature import Audio2Feature  # type: ignore

            if not os.path.exists(args.video_path):
                raise RuntimeError(f"Video path '{args.video_path}' not found")
            if not os.path.exists(args.audio_path):
                raise RuntimeError(f"Audio path '{args.audio_path}' not found")
            # Check if the GPU supports float16
            is_fp16_supported = (
                torch.cuda.is_available() and torch.cuda.get_device_capability()[0] > 7
            )
            dtype = torch.float16 if is_fp16_supported else torch.float32
            self.dtype = dtype
            logger.info(f"Input video path: {args.video_path}")
            logger.info(f"Input audio path: {args.audio_path}")
            logger.info(f"Loaded checkpoint path: {args.inference_ckpt_path}")
            scheduler = DDIMScheduler.from_pretrained("configs")
            config = OmegaConf.load(args.unet_config_path)
            self.config = config
            self.args = args
            if config.model.cross_attention_dim == 768:
                whisper_model_path = "checkpoints/whisper/small.pt"
            elif config.model.cross_attention_dim == 384:
                whisper_model_path = "checkpoints/whisper/tiny.pt"
            else:
                raise NotImplementedError("cross_attention_dim must be 768 or 384")
            audio_encoder = Audio2Feature(
                model_path=whisper_model_path,
                device="cuda",
                num_frames=config.data.num_frames,
                audio_feat_length=config.data.audio_feat_length,
            )

            vae = AutoencoderKL.from_pretrained(
                "stabilityai/sd-vae-ft-mse", torch_dtype=dtype
            )
            vae.config.scaling_factor = 0.18215  # type: ignore
            vae.config.shift_factor = 0  # type: ignore

            denoising_unet, _ = UNet3DConditionModel.from_pretrained(
                OmegaConf.to_container(config.model),
                args.inference_ckpt_path,
                device="cpu",
            )

            denoising_unet = denoising_unet.to(dtype=dtype)

            self.pipeline = LipsyncPipeline(
                vae=vae,
                audio_encoder=audio_encoder,
                denoising_unet=denoising_unet,
                scheduler=scheduler,
            ).to("cuda")

            if args.seed != -1:
                set_seed(args.seed)
            else:
                torch.seed()

            print(f"Initial seed: {torch.initial_seed()}")
            pass

    @modal.method()
    def infer(self, video_path: str, audio_path: str, video_out_path: str):
        import os

        if not os.path.exists(video_path):
            raise RuntimeError(f"Video path '{video_path}' not found")
        if not os.path.exists(audio_path):
            raise RuntimeError(f"Audio path '{audio_path}' not found")

        with latent_sync_image.imports():
            args = self.args
            config = self.config
            dtype = self.dtype
            self.pipeline(
                video_path=video_path,
                audio_path=audio_path,
                video_out_path=video_out_path,
                video_mask_path=video_out_path.replace(".mp4", "_mask.mp4"),
                num_frames=config.data.num_frames,
                num_inference_steps=args.inference_steps,
                guidance_scale=args.guidance_scale,
                weight_dtype=dtype,
                width=config.data.resolution,
                height=config.data.resolution,
                mask_image_path=config.data.mask_image_path,
            )
            vol.commit()
            pass


@app.function(image=muse_talk_image, volumes={"/cache": vol}, gpu="L40S")
def infer_musetalk(
    video_path: StrPath,
    audio_path: StrPath,
    output_video_name: StrPath = "out.mp4",
    version: Literal["v1.0", "v1.5"] = "v1.5",
    mode: Literal["normal", "realtime"] = "normal",
):
    """
    Runs MuseTalk inference using the Python script directly.
    """
    import os
    import yaml
    import sys

    # --- Prepare config ---
    results_dir = "/cache/results/musetalk"
    test_yaml_path = "./configs/inference/run.yaml"
    test_yaml_content = {
        "task_0": {
            "video_path": str(video_path),
            "audio_path": str(audio_path),
            "result_name": output_video_name,
        }
    }
    with open(test_yaml_path, "w") as f:
        yaml.dump(test_yaml_content, f)
    logger.info(f"Wrote inference config to {test_yaml_path}")

    # --- Prepare args for script ---
    # Map version to script arg
    version_map = {"v1.0": "v1", "v1.5": "v15"}
    script_version = version_map[version]

    # Import the script as a module (assume it's in PYTHONPATH or same dir)
    sys.path.append(os.getcwd())
    try:
        from scripts.inference import (  # type: ignore
            main as musetalk_main,
        )
    except ImportError:
        logger.error(
            "Could not import scripts.inference.main. Ensure the script is available."
        )
        raise

    # Build argparse.Namespace to mimic CLI args
    import argparse

    args = argparse.Namespace(
        ffmpeg_path="",
        gpu_id=0,
        vae_type="sd-vae",
        unet_config="./models/musetalk/musetalk.json"
        if version == "v1.0"
        else "./models/musetalkV15/musetalk.json",
        unet_model_path="./models/musetalk/pytorch_model.bin"
        if version == "v1.0"
        else "./models/musetalkV15/unet.pth",
        whisper_dir="./models/whisper",
        inference_config=test_yaml_path,
        bbox_shift=0,
        result_dir=results_dir,
        extra_margin=10,
        fps=25,
        audio_padding_length_left=2,
        audio_padding_length_right=2,
        batch_size=8,
        output_vid_name=None,
        use_saved_coord=False,
        saved_coord=False,
        use_float16=False,
        parsing_mode="jaw",
        left_cheek_width=90,
        right_cheek_width=90,
        version=script_version,
    )

    # --- Run inference directly ---
    try:
        musetalk_main(args)
        vol.commit()
        return {"status": "success", "result_dir": args.result_dir}
    except Exception as e:
        logger.error(f"MuseTalk inference failed: {e}")
        raise RuntimeError(f"MuseTalk inference failed: {e}")


@app.function(
    image=hunyuan_i2v_image, volumes={"/cache": vol}, gpu="A100-80GB", max_containers=1
)
def infer_hunyuan_i2v(
    prompt: str = "An Asian man with short hair in black tactical uniform and white clothes waves a firework stick.",
    i2v_image_path: str = "./assets/demo/i2v/imgs/0.jpg",
    save_path: str = "./results",
    model_base: str = "ckpts",
    i2v_resolution: str = "720p",
    video_length: int = 129,
    infer_steps: int = 50,
    seed: int = 0,
    embedded_cfg_scale: float | None = 6.0,
    flow_shift: float = 7.0,
    ulysses_degree: int = 1,
    ring_degree: int = 1,
):
    """
    Runs Hunyuan I2V inference using the Python API directly.
    """
    import os
    import sys
    import time
    import argparse

    logger = get_logger(__name__)

    assert os.path.exists(i2v_image_path), f"Image path '{i2v_image_path}' not found"
    assert os.path.exists(model_base), f"Model base path '{model_base}' not found"

    os.environ["PYTORCH_CUDA_ALLOC_CONF"] = "expandable_segments:True"
    sys.path.append(os.getcwd())

    try:
        from hyvideo.utils.file_utils import save_videos_grid  # type: ignore
        from hyvideo.inference import HunyuanVideoSampler  # type: ignore
        from loguru import logger  # type: ignore
        from datetime import datetime
    except ImportError as e:
        print(f"Import error: {e}")
        raise RuntimeError("Could not import hyvideo modules. Check your environment.")

    args = argparse.Namespace(
        # --- Required/explicit ---
        prompt=prompt,
        model_base=model_base,
        save_path=save_path,
        i2v_mode=True,
        i2v_resolution=i2v_resolution,
        i2v_image_path=i2v_image_path,
        video_length=video_length,
        infer_steps=infer_steps,
        flow_shift=flow_shift,
        ulysses_degree=ulysses_degree,
        ring_degree=ring_degree,
        # --- Optional/with defaults ---
        seed=seed,
        embedded_cfg_scale=embedded_cfg_scale,
        # --- Defaults from config.py ---
        model="HYVideo-T/2",
        latent_channels=16,
        precision="bf16",
        rope_theta=256,
        gradient_checkpoint=False,
        gradient_checkpoint_layers=-1,
        vae="884-16c-hy",
        vae_precision="fp16",
        vae_tiling=True,
        text_encoder="llm-i2v",
        text_encoder_precision="fp16",
        text_states_dim=4096,
        text_len=256,
        tokenizer="llm-i2v",
        prompt_template="dit-llm-encode-i2v",
        prompt_template_video="dit-llm-encode-video-i2v",
        hidden_state_skip_layer=2,
        apply_final_norm=False,
        text_encoder_2="clipL",
        text_encoder_precision_2="fp16",
        text_states_dim_2=768,
        tokenizer_2="clipL",
        text_len_2=77,
        denoise_type="flow",
        flow_reverse=False,
        flow_solver="euler",
        use_linear_quadratic_schedule=False,
        linear_schedule_end=25,
        model_resolution="540p",
        dit_weight="ckpts/hunyuan-video-t2v-720p/transformers/mp_rank_00_model_states.pt",
        i2v_dit_weight="ckpts/hunyuan-video-i2v-720p/transformers/mp_rank_00_model_states.pt",
        load_key="module",
        use_cpu_offload=False,
        batch_size=1,
        disable_autocast=False,
        save_path_suffix="",
        name_suffix="",
        num_videos=1,
        video_size=[720, 1280],
        seed_type="auto",
        neg_prompt=None,
        cfg_scale=1.0,
        use_fp8=False,
        reproduce=False,
        i2v_condition_type="token_replace",
        i2v_stability=False,
        use_lora=False,
        lora_path="",
        lora_scale=1.0,
        lora_rank=64,
    )

    # Now run inference as before
    if not os.path.exists(args.save_path):
        os.makedirs(args.save_path, exist_ok=True)
    print(args)
    hunyuan_video_sampler = HunyuanVideoSampler.from_pretrained(
        Path(args.model_base), args=args
    )
    args = hunyuan_video_sampler.args
    print(args)

    outputs = hunyuan_video_sampler.predict(
        prompt=args.prompt,
        height=args.video_size[0],
        width=args.video_size[1],
        video_length=args.video_length,
        seed=args.seed,
        negative_prompt=args.neg_prompt,
        infer_steps=args.infer_steps,
        guidance_scale=args.cfg_scale,
        num_videos_per_prompt=args.num_videos,
        flow_shift=args.flow_shift,
        batch_size=args.batch_size,
        embedded_guidance_scale=args.embedded_cfg_scale,
        i2v_mode=args.i2v_mode,
        i2v_resolution=args.i2v_resolution,
        i2v_image_path=args.i2v_image_path,
        i2v_condition_type=args.i2v_condition_type,
        i2v_stability=args.i2v_stability,
        ulysses_degree=args.ulysses_degree,
        ring_degree=args.ring_degree,
    )
    samples = outputs["samples"]

    if "LOCAL_RANK" not in os.environ or int(os.environ["LOCAL_RANK"]) == 0:
        for i, sample in enumerate(samples):
            sample = samples[i].unsqueeze(0)
            time_flag = datetime.fromtimestamp(time.time()).strftime(
                "%Y-%m-%d-%H:%M:%S"
            )
            cur_save_path = f"{args.save_path}/{time_flag}_seed{outputs['seeds'][i]}_{outputs['prompts'][i][:100].replace('/', '')}.mp4"
            save_videos_grid(sample, cur_save_path, fps=24)
            logger.info(f"Sample save to: {cur_save_path}")
        vol.commit()
        return {"status": "success", "output_dir": args.save_path}
    else:
        raise RuntimeError("LOCAL_RANK is not 0, skipping save.")


@app.local_entrypoint()
def test_hunyuan_i2v():
    infer_hunyuan_i2v.remote()


def prepare_magi_config(config_path: str):
    import json

    cfg = {
        "model_config": {
            "model_name": "videodit_ardf",
            "num_layers": 34,
            "hidden_size": 3072,
            "ffn_hidden_size": 12288,
            "num_attention_heads": 24,
            "num_query_groups": 8,
            "kv_channels": 128,
            "layernorm_epsilon": 1e-06,
            "apply_layernorm_1p": True,
            "x_rescale_factor": 1,
            "half_channel_vae": False,
            "params_dtype": "torch.bfloat16",
            "patch_size": 2,
            "t_patch_size": 1,
            "in_channels": 16,
            "out_channels": 16,
            "cond_hidden_ratio": 0.25,
            "caption_channels": 4096,
            "caption_max_length": 800,
            "xattn_cond_hidden_ratio": 1.0,
            "cond_gating_ratio": 1.0,
            "gated_linear_unit": False,
        },
        "runtime_config": {
            "cfg_number": 3,
            "cfg_t_range": [0.0, 0.0217, 0.1, 0.3, 0.999],
            "prev_chunk_scales": [1.5, 1.5, 1.5, 1.0, 1.0],
            "text_scales": [7.5, 7.5, 7.5, 0.0, 0.0],
            "noise2clean_kvrange": [5, 4, 3, 2],
            "clean_chunk_kvrange": 1,
            "clean_t": 0.9999,
            "seed": 1234,
            "num_frames": 192,
            "video_size_h": 720,
            "video_size_w": 1280,
            "num_steps": 64,
            "window_size": 4,
            "fps": 24,
            "chunk_width": 6,
            "load": "./downloads/ckpt/magi/24B_base",
            "t5_pretrained": "./downloads/ckpt/t5",
            # "t5_device": "cuda",
            "vae_pretrained": "./downloads/ckpt/vae",
            "scale_factor": 0.18215,
            "temporal_downsample_factor": 4,
        },
        "engine_config": {
            "distributed_backend": "nccl",
            "distributed_timeout_minutes": 15,
            "pp_size": 1,
            "cp_size": 1,
            "cp_strategy": "cp_ulysses",
            "ulysses_overlap_degree": 1,
            "fp8_quant": False,
            "distill_nearly_clean_chunk_threshold": 0.3,
            "shortcut_mode": "8,16,16",
            "distill": False,
            "kv_offload": True,
            "enable_cuda_graph": False,
        },
    }
    with open(config_path, "w") as f:
        json.dump(cfg, f, indent=2)

    # load it and check
    with open(config_path, "r") as f:
        loaded_cfg = json.load(f)
    print("Loaded config:", loaded_cfg)


@app.function(
    image=magi_image,
    timeout=1800,  # 30 minutes
    volumes={"/cache": vol},
    gpu="A100",
)
def generate_magi_video(
    model_size: str = "4.5B",  # '4.5B' or '24B'
    mode: str = "t2v",  # 't2v', 'i2v', or 'v2v'
    prompt: str = "A golden retriever puppy playing in a field of flowers",
    image_bytes: bytes | None = None,  # Input for i2v mode
    prefix_video_bytes: bytes | None = None,  # Input for v2v mode
):
    """
    Generates a video using the MAGI-1 model by calling the Python entrypoint directly.
    """
    import time
    import os
    import sys
    import torch
    import subprocess

    subprocess.run("ls -al ./downloads/ckpt", shell=True, check=True)
    raise NotImplementedError("example not ready")

    # raise NotImplementedError("example not ready")

    assert torch.cuda.is_available(), (
        "CUDA is not available. Ensure you're running on a GPU."
    )

    start_time = time.time()

    # --- 1. Set environment variables as needed ---
    os.environ["MASTER_ADDR"] = "localhost"
    os.environ["MASTER_PORT"] = "6009"
    os.environ["GPUS_PER_NODE"] = "1"
    os.environ["NNODES"] = "1"
    os.environ["WORLD_SIZE"] = "1"
    os.environ["CUDA_VISIBLE_DEVICES"] = "0"
    os.environ["PAD_HQ"] = "1"
    os.environ["PAD_DURATION"] = "1"
    os.environ["PYTORCH_CUDA_ALLOC_CONF"] = "expandable_segments:True"
    os.environ["OFFLOAD_T5_CACHE"] = "true"
    os.environ["OFFLOAD_VAE_CACHE"] = "true"
    os.environ["TORCH_CUDA_ARCH_LIST"] = "8.9;9.0"

    base_path = os.getcwd()
    magi_root = base_path  # If needed, adjust to repo root
    os.environ["PYTHONPATH"] = f"{magi_root}:{os.environ.get('PYTHONPATH', '')}"

    config_path = os.path.join(
        base_path, f"example/{model_size}/{model_size}_config.json"
    )
    prepare_magi_config(config_path)
    output_filename = f"output_{time.time()}.mp4"
    output_path = os.path.join("/tmp", output_filename)
    input_dir = "/tmp/magi_inputs"
    os.makedirs(input_dir, exist_ok=True)

    # --- 2. Prepare input files if needed ---
    input_image_path = None
    input_video_path = None

    extra_args = []
    if mode == "i2v":
        if image_bytes is None:
            raise ValueError("Image bytes must be provided for i2v mode")
        input_image_path = os.path.join(input_dir, "input_image.jpg")
        with open(input_image_path, "wb") as f:
            f.write(image_bytes)
        extra_args.extend(["--image_path", input_image_path])
    elif mode == "v2v":
        if prefix_video_bytes is None:
            raise ValueError("Prefix video bytes must be provided for v2v mode")
        input_video_path = os.path.join(input_dir, "prefix_video.mp4")
        with open(input_video_path, "wb") as f:
            f.write(prefix_video_bytes)
        extra_args.extend(["--prefix_video_path", input_video_path])

    # --- 3. Prepare sys.argv for the entrypoint ---
    sys_argv = [
        "entry.py",
        "--config_file",
        config_path,
        "--mode",
        mode,
        "--prompt",
        prompt,
        "--output_path",
        output_path,
    ] + extra_args

    # --- 4. Import and call the entrypoint ---
    sys.path.insert(0, base_path)
    try:
        from inference.pipeline.entry import main as magi_main  # type: ignore
    except ImportError as e:
        print(
            "Could not import inference.pipeline.entry.main. Check PYTHONPATH and repo structure."
        )
        raise
    # load": "./downloads/4.5B_base",
    # "t5_pretrained": "./downloads/t5_pretrained",
    # "vae_pretrained": "./downloads/vae",
    # Patch sys.argv for argparse in entry.py
    old_argv = sys.argv
    sys.argv = sys_argv
    try:
        magi_main()
    except SystemExit as e:
        # argparse may call sys.exit(), which raises SystemExit
        if e.code != 0:
            print(f"MAGI entrypoint exited with code {e.code}")
            raise
    finally:
        sys.argv = old_argv

    # --- 5. Read and return the output video ---
    video_bytes = None
    if os.path.exists(output_path):
        with open(output_path, "rb") as f:
            video_bytes = f.read()
        os.remove(output_path)
    else:
        print(f"Error: Output file not found at {output_path} after script execution.")

    # --- 6. Clean up input files ---
    if input_image_path and os.path.exists(input_image_path):
        os.remove(input_image_path)
    if input_video_path and os.path.exists(input_video_path):
        os.remove(input_video_path)

    end_time = time.time()
    print(f"Total generation time: {end_time - start_time:.2f} seconds")

    return video_bytes


# --- Local Entrypoint for Testing ---
@app.local_entrypoint()
def test_magi():
    print("Running Text-to-Video example...")
    # --- Text-to-Video ---
    t2v_prompt = "Astronaut riding a horse on the moon"
    video_data = generate_magi_video.remote(
        model_size="4.5B",  # Or "24B" - check GPU requirements
        mode="t2v",
        prompt=t2v_prompt,
    )

    if video_data:
        output_filename = "magi_t2v_output.mp4"
        with open(output_filename, "wb") as f:
            f.write(video_data)
        print(f"Text-to-Video output saved to: {output_filename}")
    else:
        print("Text-to-Video generation failed or produced no output.")

    # --- Image-to-Video (Example) ---
    # print("\nRunning Image-to-Video example...")
    # try:
    #     # Create a dummy image file locally for testing
    #     dummy_image_path = "dummy_input_image.jpg"
    #     # You should replace this with a real image file
    #     if not os.path.exists(dummy_image_path):
    #         from PIL import Image
    #         img = Image.new('RGB', (60, 30), color = 'red')
    #         img.save(dummy_image_path)
    #         print(f"Created dummy image: {dummy_image_path}")

    #     with open(dummy_image_path, "rb") as img_file:
    #         img_bytes = img_file.read()

    #     i2v_prompt = "make the red rectangle animate"
    #     video_data_i2v = generate_magi_video.remote(
    #         model_size="4.5B",
    #         mode="i2v",
    #         prompt=i2v_prompt,
    #         image_bytes=img_bytes
    #     )

    #     if video_data_i2v:
    #         output_filename_i2v = "magi_i2v_output.mp4"
    #         with open(output_filename_i2v, "wb") as f:
    #             f.write(video_data_i2v)
    #         print(f"Image-to-Video output saved to: {output_filename_i2v}")
    #     else:
    #         print("Image-to-Video generation failed or produced no output.")

    # except FileNotFoundError:
    #     print(f"Input image '{dummy_image_path}' not found. Skipping I2V example.")
    # except Exception as e:
    #     print(f"An error occurred during I2V example: {e}")


@app.cls(image=ltx_video_image, volumes={"/cache": vol}, gpu="L40S", max_containers=1)
class LtxVideoApi:
    @modal.enter()
    def enter(self):
        # Optionally preload models or set up environment here
        pass

    @modal.method()
    def infer(self, prompt: str):
        import subprocess

        ckpt_path = "/ltx-video/ckpt/ltxv-2b-0.9.6-distilled-04-25.safetensors"
        cmd = [
            "python",
            "inference.py",
            "--ckpt_path",
            ckpt_path,
            "--prompt",
            prompt,
            # "--height",
            # "500",
            # "--width",
            # "400",
            # "--num_frames",
            # "100",
            "--seed",
            "0",
        ]

        # cmd = f"python inference.py --ckpt_path '{ckpt_path}' --prompt '{prompt}' --height 500 --width 400 --num_frames 100 --seed 0"
        subprocess.run(cmd, check=True)

    @modal.method()
    def _infer(
        self,
        prompt: str,
        ckpt_path: str = "/ltx-video/ckpt/ltxv-2b-0.9.6-distilled-04-25.safetensors",
        output_path: Optional[str] = None,
        seed: int = 171198,
        num_inference_steps: int = 40,
        num_images_per_prompt: int = 1,
        guidance_scale: float = 3.0,
        stg_scale: float = 1.0,
        stg_rescale: float = 0.7,
        stg_mode: str = "attention_values",
        stg_skip_layers: str = "19",
        image_cond_noise_scale: float = 0.15,
        height: int = 704,
        width: int = 1216,
        num_frames: int = 121,
        frame_rate: int = 30,
        precision: str = "bfloat16",
        decode_timestep: float = 0.05,
        decode_noise_scale: float = 0.025,
        negative_prompt: str = "worst quality, inconsistent motion, blurry, jittery, distorted",
        offload_to_cpu: bool = False,
        text_encoder_model_name_or_path: str = "PixArt-alpha/PixArt-XL-2-1024-MS",
        conditioning_media_paths: Optional[list] = None,
        conditioning_strengths: Optional[list] = None,
        conditioning_start_frames: Optional[list] = None,
        sampler: Optional[str] = None,
        prompt_enhancement_words_threshold: int = 50,
        prompt_enhancer_image_caption_model_name_or_path: str = "MiaoshouAI/Florence-2-large-PromptGen-v2.0",
        prompt_enhancer_llm_model_name_or_path: str = "unsloth/Llama-3.2-3B-Instruct",
        stochastic_sampling: bool = False,
    ):
        """
        Runs LTX-Video inference using the pipeline logic from inference.py.
        """
        import sys
        import os

        assert os.path.exists(ckpt_path), f"Checkpoint path '{ckpt_path}' not found"

        # If inference.py is not a module, you can copy the infer function here.
        # Otherwise, import it:
        sys.path.append(os.getcwd())
        try:
            from inference import infer  # type: ignore
        except ImportError:
            raise RuntimeError(
                "Could not import 'infer' from inference.py. Check your path."
            )

        # Prepare arguments for the infer function
        kwargs = dict(
            ckpt_path=ckpt_path,
            output_path=output_path,
            seed=seed,
            num_inference_steps=num_inference_steps,
            num_images_per_prompt=num_images_per_prompt,
            guidance_scale=guidance_scale,
            stg_scale=stg_scale,
            stg_rescale=stg_rescale,
            stg_mode=stg_mode,
            stg_skip_layers=stg_skip_layers,
            image_cond_noise_scale=image_cond_noise_scale,
            height=height,
            width=width,
            num_frames=num_frames,
            frame_rate=frame_rate,
            precision=precision,
            decode_timestep=decode_timestep,
            decode_noise_scale=decode_noise_scale,
            prompt=prompt,
            negative_prompt=negative_prompt,
            offload_to_cpu=offload_to_cpu,
            text_encoder_model_name_or_path=text_encoder_model_name_or_path,
            conditioning_media_paths=conditioning_media_paths,
            conditioning_strengths=conditioning_strengths,
            conditioning_start_frames=conditioning_start_frames,
            sampler=sampler,
            prompt_enhancement_words_threshold=prompt_enhancement_words_threshold,
            prompt_enhancer_image_caption_model_name_or_path=prompt_enhancer_image_caption_model_name_or_path,
            prompt_enhancer_llm_model_name_or_path=prompt_enhancer_llm_model_name_or_path,
            stochastic_sampling=stochastic_sampling,
        )

        # Call the infer function
        infer(**kwargs)
        # Optionally, return the output path or any result you want
        return {"status": "success", "output_path": output_path}


@app.local_entrypoint()
def test_ltx():
    LtxVideoApi().infer.remote(prompt="A cat dancing in a disco ball")


@app.local_entrypoint()
def test_musetalk():
    infer_musetalk.remote("data/video/yongen.mp4", "data/audio/yongen.wav")
    pass


@app.local_entrypoint()
def g():
    for f in vol.iterdir("/inputs"):
        print(f)
    data = b""
    for chunk in vol.read_file("inputs/out.mp4"):
        data += chunk
    with open("tmp/latent_sync_out.mp4", "wb") as f:
        f.write(data)


def run_lip_sync_inference_segments():
    import subprocess
    import json
    import os
    from pathlib import Path

    sync_modal_vol()  # Ensure local tmp matches remote /cache/inputs

    base_video_name = "trump_joerogan_trump_only_2min_vertical.mp4"
    _base_video_path_remote = f"/cache/inputs/{base_video_name}"
    audio_dir_remote = "/cache/inputs/trump_shorts"

    audio_files = sorted(
        [f for f in os.listdir("tmp/trump_shorts") if f.endswith(".enhanced.wav")],
        key=lambda x: int(Path(x).stem.split(".")[0]),
    )
    audio_files = audio_files[:2]

    current_start_time = 0.0
    api = LatentSyncApi()

    for audio_file_name in audio_files:
        audio_file_path_local = f"tmp/trump_shorts/{audio_file_name}"
        audio_file_path_remote = f"{audio_dir_remote}/{audio_file_name}"
        duration = get_duration(audio_file_path_local)
        end_time = current_start_time + duration

        segment_index = Path(audio_file_name).stem.split(".")[0]
        segment_video_path_remote = f"{audio_dir_remote}/{segment_index}.segment.mp4"
        output_video_path_remote = f"{audio_dir_remote}/{segment_index}.out.mp4"

        base_video_path_local = f"tmp/{base_video_name}"
        if not os.path.exists(base_video_path_local):
            raise FileNotFoundError(
                f"Base video {base_video_name} not found locally. Please sync or download it."
            )
        segment_output_local = f"tmp/trump_shorts/{segment_index}.segment.mp4"
        # --- Updated ffmpeg command: cut on keyframes, stream copy ---
        ffmpeg_cmd = [
            "ffmpeg",
            "-y",
            "-ss",
            f"{current_start_time:.6f}",
            "-to",
            f"{end_time:.6f}",
            "-i",
            base_video_path_local,
            "-c",
            "copy",
            "-avoid_negative_ts",
            "make_zero",
            segment_output_local,
        ]
        try:
            logger.info(
                f"Cutting segment {segment_index} from {current_start_time:.6f} to {end_time:.6f} (keyframe aligned)..."
            )
            subprocess.run(ffmpeg_cmd, check=True, capture_output=True)
            logger.info(f"Segment {segment_index}.segment.mp4 created locally.")
            with vol.batch_upload(force=True) as batch:
                batch.put_file(
                    segment_output_local,
                    segment_video_path_remote,
                )
            logger.info(f"Uploaded segment to {segment_video_path_remote}")

        except subprocess.CalledProcessError as e:
            logger.error(f"Error cutting video segment {segment_index}: {e}")
            logger.error(f"FFMPEG stderr: {e.stderr.decode()}")
            raise RuntimeError(f"ffmpeg error cutting segment {segment_index}")
        current_start_time = end_time

    logger.info("Finished processing all audio segments.")
    inputs = []
    for audio_file_name in audio_files:
        segment_index = Path(audio_file_name).stem.split(".")[0]
        segment_video_path_remote = f"{audio_dir_remote}/{segment_index}.segment.mp4"
        audio_file_path_remote = f"{audio_dir_remote}/{audio_file_name}"
        output_video_path_remote = f"{audio_dir_remote}/{segment_index}.out.mp4"
        inputs.append(
            (
                segment_video_path_remote,
                audio_file_path_remote,
                output_video_path_remote,
            )
        )
    for _ in api.infer.starmap(inputs):
        print(_)
    pass


def convert_segments_to_video():
    from pathlib import Path
    import subprocess
    import os

    base_dir = Path.cwd()
    tmp_dir = base_dir / "tmp"
    shorts_dir = tmp_dir / "trump_shorts"

    # Dynamically find all .out.mp4 segments and sort by index
    segments = sorted(
        [p for p in shorts_dir.glob("*.out.mp4")],
        key=lambda p: int(p.stem.split(".")[0]),
    )
    output_file = tmp_dir / "final_trump_video.mp4"
    list_file = tmp_dir / "mylist.txt"

    with open(list_file, "w") as f:
        for segment_path in segments:
            if segment_path.exists():
                f.write(f"file '{segment_path.resolve()}'\n")
            else:
                logger.warning(f"Segment file not found, skipping: {segment_path}")

    if not list_file.exists() or list_file.stat().st_size == 0:
        logger.error("No valid segments found or list file could not be created.")
        return

    # --- Updated: re-encode final output for smoothness ---
    ffmpeg_cmd = [
        "ffmpeg",
        "-y",
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        str(list_file.resolve()),
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "18",
        "-c:a",
        "aac",
        str(output_file.resolve()),
    ]

    try:
        logger.info(
            f"Concatenating segments into {output_file} (re-encoding for smoothness)..."
        )
        result = subprocess.run(ffmpeg_cmd, check=True, capture_output=True, text=True)
        logger.info("FFmpeg stdout:")
        logger.info(result.stdout)
        logger.info("FFmpeg stderr:")
        logger.info(result.stderr)
        logger.info(f"Successfully created {output_file}")
    except subprocess.CalledProcessError as e:
        logger.error(f"Error during ffmpeg concatenation:")
        logger.error(f"Command: {' '.join(e.cmd)}")
        logger.error(f"Return code: {e.returncode}")
        logger.error(f"Stderr: {e.stderr}")
        logger.error(f"Stdout: {e.stdout}")
    finally:
        if list_file.exists():
            os.remove(list_file)
            logger.info(f"Removed temporary list file: {list_file}")


@app.local_entrypoint()
def main():
    run_lip_sync_inference_segments()
    segs = []
    for f in vol.iterdir("inputs/trump_shorts"):
        if f.path.endswith(".out.mp4"):
            segs.append(f.path)
    for f in segs:
        buf = b""
        for chunk in vol.read_file(f):
            buf += chunk
        with open(f"tmp/trump_shorts/{Path(f).name}", "wb") as f:
            f.write(buf)
    convert_segments_to_video()
