from typing import Optional
import modal

app = modal.App(name="video2x")
vol = modal.Volume.from_name("cache", create_if_missing=True)

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
    .apt_install("git", "curl", "libvulkan1")
    .run_commands(
        # Add FFmpeg repository
        "add-apt-repository -y ppa:ubuntuhandbook1/ffmpeg7",
        # Download Video2X .deb package
        "curl -LO https://github.com/k4yt3x/video2x/releases/download/6.2.0/video2x-linux-ubuntu2204-amd64.deb",
        # Install NVIDIA drivers, FFmpeg and Video2X
        "apt-get install -y ffmpeg ./video2x-linux-ubuntu2204-amd64.deb",
        # Set Vulkan environment variable - this will be available during container build
        "echo 'export VK_ICD_FILENAMES=/usr/share/vulkan/icd.d/nvidia_icd.json' >> /etc/bash.bashrc",
    )
)


@app.function(image=image, volumes={"/cache": vol}, gpu="L40S")
def video2x_cli(
    input_path: str,
    output_path: Optional[str] = None,
    processor: str = "realesrgan",
    # Upscaling parameters
    scaling_factor: Optional[int] = None,
    width: Optional[int] = None,
    height: Optional[int] = None,
    realesrgan_model: str = "realesr-animevideov3",
    libplacebo_shader: str = "anime4k-v4-a+a",
    # Frame interpolation parameters
    frame_rate_mul: Optional[int] = None,
    rife_model: str = "rife-v4.6",
    scene_thresh: int = 100,
    # General parameters
    device_id: int = 0,
    codec: str = "libx264",
    crf: int = 17,
    preset: str = "medium",
):
    """
    Enhance a video using Video2X - supports both upscaling and frame interpolation.

    Args:
        input_path: Path to the input video file
        output_path: Path to save the output video (default: input_name_enhanced.mp4)
        processor: Processor to use (libplacebo, realesrgan, rife)

        # Upscaling parameters (use either scaling_factor OR width and height)
        scaling_factor: Scaling factor (e.g., 2 for 2x upscaling)
        width: Target output width in pixels
        height: Target output height in pixels
        realesrgan_model: Model for RealESRGAN (realesr-animevideov3, realesrgan-plus-anime, realesrgan-plus)
        libplacebo_shader: Shader for libplacebo (anime4k-v4-a, anime4k-v4-a+a, etc.)

        # Frame interpolation parameters
        frame_rate_mul: Frame rate multiplier (e.g., 2 will double the frame rate)
        rife_model: RIFE model name (rife-v4.6, rife-v3.1, etc.)
        scene_thresh: Scene detection threshold (100 means no scene detection)

        # General parameters
        device_id: GPU ID (Vulkan device index)
        codec: Output video codec
        crf: Constant Rate Factor (quality, lower is better)
        preset: Encoder preset (ultrafast to veryslow)

    Returns:
        Path to the enhanced video
    """
    from subprocess import run, PIPE, CalledProcessError
    import os
    import shutil

    # Set Vulkan ICD environment variable (needed at runtime)
    os.environ["VK_ICD_FILENAMES"] = "/usr/share/vulkan/icd.d/nvidia_icd.json"

    # Ensure the input path exists
    if not os.path.exists(input_path):
        raise FileNotFoundError(f"Input file not found: {input_path}")

    # If output path is not provided, create one based on the input name
    if output_path is None:
        input_name = os.path.splitext(os.path.basename(input_path))[0]
        enhancement = []
        if scaling_factor or (width and height):
            enhancement.append("upscaled")
        if frame_rate_mul:
            enhancement.append("interpolated")

        enhancement_str = "_" + "_".join(enhancement) if enhancement else "_enhanced"
        output_path = f"/cache/{input_name}{enhancement_str}.mp4"

    cmd = [
        "video2x",
        "-i",
        input_path,
        "-o",
        output_path,
        "-p",
        processor,
        "-d",
        str(device_id),
        "-c",
        codec,
    ]

    # Add encoder options
    cmd.extend(["-e", f"crf={crf}", "-e", f"preset={preset}"])

    # Add upscaling options if applicable
    if scaling_factor or (width and height):
        if width and height:
            cmd.extend(["-w", str(width), "-h", str(height)])
        elif scaling_factor:
            cmd.extend(["-s", str(scaling_factor)])

    # Add frame interpolation options if applicable
    if frame_rate_mul:
        cmd.extend(["-m", str(frame_rate_mul), "-t", str(scene_thresh)])

    # Add processor-specific options
    if processor == "realesrgan":
        cmd.extend(["--realesrgan-model", realesrgan_model])
    elif processor == "libplacebo":
        cmd.extend(["--libplacebo-shader", libplacebo_shader])
    elif processor == "rife":
        cmd.extend(["--rife-model", rife_model])

    try:
        # Run the command
        print(f"Running command: {' '.join(cmd)}")
        _ = run(cmd, stdout=PIPE, stderr=PIPE, check=True)
        print("Video enhancement completed successfully")

        # Copy the output to a more accessible location if it's in /cache
        if output_path.startswith("/cache/") and os.path.exists(output_path):
            local_path = f"/tmp/{os.path.basename(output_path)}"
            shutil.copy(output_path, local_path)
            print(f"Copied output to {local_path}")
            return local_path

        return output_path
    except CalledProcessError as e:
        print(f"Error running video2x: {e}")
        print(f"stderr: {e.stderr.decode() if e.stderr else 'No stderr'}")
        raise RuntimeError(
            "Failed to enhance video. Please check the logs for details."
        )


@app.local_entrypoint()
def main():
    # Example usage of the enhance_video function
    print("Video2X is ready to use!")
    print("\nExample usages:")

    print("\n1. Upscale a video with RealESRGAN:")
    print("enhance_video.remote(")
    print("    input_path='your_video.mp4',")
    print("    processor='realesrgan',")
    print("    scaling_factor=2,")
    print("    realesrgan_model='realesr-animevideov3'")
    print(")")

    print("\n2. Frame interpolation with RIFE:")
    print("enhance_video.remote(")
    print("    input_path='your_video.mp4',")
    print("    processor='rife',")
    print("    frame_rate_mul=2,")
    print("    rife_model='rife-v4.6'")
    print(")")

    print("\n3. Both upscaling and frame interpolation (two-step process):")
    print("# Step 1: Upscale first")
    print("upscaled = enhance_video.remote(")
    print("    input_path='your_video.mp4',")
    print("    processor='realesrgan',")
    print("    scaling_factor=2")
    print(")")
    print("# Step 2: Interpolate the upscaled video")
    print("result = enhance_video.remote(")
    print("    input_path=upscaled,")
    print("    processor='rife',")
    print("    frame_rate_mul=2")
    print(")")

    _ = video2x_cli.remote(
        input_path="/dev/null",  # Intentionally invalid for demonstration
        output_path="/dev/null",
    )
