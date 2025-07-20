import modal
from pathlib import Path
import os
import cv2

app = modal.App(name="real_esrgan")
vol = modal.Volume.from_name("cache", create_if_missing=True)

image = (
    modal.Image.from_registry("python:3.9-bookworm")
    .run_commands(
        "apt-get update -y && apt-get -y install ffmpeg wget git libsm6 libxext6 libglib2.0-0"
    )
    .run_commands(
        "git clone --branch v0.3.0 --depth 1 https://github.com/xinntao/Real-ESRGAN.git /real_esrgan"
    )
    .workdir("/real_esrgan")
    .run_commands("mkdir -p outputs")
    .pip_install(
        "ffmpeg-python",
        "torch==1.7.1+cu110",
        "torchvision==0.8.2+cu110",
        "numpy==1.21.1",
        "lmdb==1.2.1",
        "opencv-python==4.5.3.56",
        "PyYAML==5.4.1",
        "tqdm==4.62.2",
        "yapf==0.31.0",
        "basicsr==1.4.2",
        "facexlib==0.2.5",
        find_links="https://download.pytorch.org/whl/torch_stable.html",
    )
    .run_commands("python setup.py develop")
    .run_commands(
        "wget https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.5.0/realesr-general-x4v3.pth -P weights",
        "wget https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.5.0/realesr-general-wdn-x4v3.pth -P weights",
        "wget https://github.com/TencentARC/GFPGAN/releases/download/v1.3.0/GFPGANv1.3.pth -P weights",
    )
    .add_local_python_source("utils")
)


@app.function(image=image, volumes={"/cache": vol}, gpu="L40S")
def enhance_image(
    input_path,
    output_path=None,
    model_name="realesr-general-x4v3",
    face_enhance=True,
    denoise_strength=0.5,
    outscale=4.0,
    tile=0,
    fp32=False,
) -> bytes:
    """
    Enhance a single image using Real-ESRGAN.

    Args:
        input_path: Path to the input image
        output_path: Path for the output image (if None, derived from input_path)
        model_name: Model to use (without .pth extension)
        face_enhance: Whether to use GFPGAN for face enhancement
        denoise_strength: Denoise strength (0-1)
        outscale: Output scale factor
        tile: Tile size (0 for no tiling)
        fp32: Use FP32 precision instead of FP16

    Returns:
        Path to the enhanced image
    """
    import sys

    sys.path.append("/real_esrgan")

    from basicsr.archs.rrdbnet_arch import RRDBNet  # type:ignore
    from realesrgan import RealESRGANer  # type:ignore
    from realesrgan.archs.srvgg_arch import SRVGGNetCompact  # type:ignore

    # Handle output path
    if output_path is None:
        input_file = Path(input_path)
        output_dir = input_file.parent
        output_path = str(output_dir / f"{input_file.stem}_enhanced{input_file.suffix}")

    # Ensure output directory exists
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    # Configure model based on model_name
    if model_name == "realesr-general-x4v3":
        model = SRVGGNetCompact(
            num_in_ch=3,
            num_out_ch=3,
            num_feat=64,
            num_conv=32,
            upscale=4,
            act_type="prelu",
        )
        netscale = 4
        model_path = os.path.join("weights", f"{model_name}.pth")
    else:
        raise ValueError(f"Unsupported model: {model_name}")

    # Use denoise weight if specified
    dni_weight = None
    if model_name == "realesr-general-x4v3" and denoise_strength != 1:
        wdn_model_path = model_path.replace(
            "realesr-general-x4v3", "realesr-general-wdn-x4v3"
        )
        model_path = [model_path, wdn_model_path]
        dni_weight = [denoise_strength, 1 - denoise_strength]

    # Create upsampler
    upsampler = RealESRGANer(
        scale=netscale,
        model_path=model_path,
        dni_weight=dni_weight,
        model=model,
        tile=tile,
        tile_pad=10,
        pre_pad=0,
        half=not fp32,
    )

    # Read image
    img = cv2.imread(input_path, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError(f"Failed to read image: {input_path}")

    # Check if image has alpha channel
    img_mode = "RGBA" if len(img.shape) == 3 and img.shape[2] == 4 else None

    try:
        # Process with face enhancement if requested
        if face_enhance:
            from gfpgan import GFPGANer  # type:ignore

            face_enhancer = GFPGANer(
                model_path="weights/GFPGANv1.3.pth",
                upscale=outscale,
                arch="clean",
                channel_multiplier=2,
                bg_upsampler=upsampler,
            )
            _, _, output = face_enhancer.enhance(
                img, has_aligned=False, only_center_face=False, paste_back=True
            )
        else:
            output, _ = upsampler.enhance(img, outscale=outscale)

        # Save the result
        cv2.imwrite(output_path, output)
        print(f"Enhanced image saved to: {output_path}")

        with open(output_path, "rb") as f:
            return f.read()

    except RuntimeError as error:
        print(f"Error processing image: {error}")
        print(
            "If you encounter CUDA out of memory, try using tiling with a smaller tile size."
        )
        raise


@app.local_entrypoint()
def main():
    # Example usage
    result = enhance_image.remote(
        input_path="inputs/0030.jpg",  # Change this to your input image path
        output_path="outputs/test_enhanced.jpg",  # Optional, will be auto-generated if not provided
        face_enhance=True,
    )
    with open("tmp/enhanced_image.jpg", "wb") as f:
        f.write(result)
    print(f"Enhanced image: {result}")
