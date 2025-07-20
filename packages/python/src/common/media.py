import json
from pathlib import Path
import subprocess
from typing import Literal, Tuple
from faster_whisper.transcribe import Segment, TranscriptionInfo
import modal
from typing import TypeVar, Optional
from pydantic import BaseModel

from dotenv import load_dotenv

from common.ffmpeg import get_duration

from .llm import parse_schema_with_llm  # noqa: F401
from .prompts import PromptUtils
from ..utils import get_logger

load_dotenv()

logger = get_logger(__name__)

APP = "promobase-infra"
vol = modal.Volume.from_name("cache", create_if_missing=True)

TSchema = TypeVar("TSchema", bound=BaseModel)


class SegmentData(BaseModel):
    id: int
    start: float
    end: float
    text: str


class TranscriptionData(BaseModel):
    segments: list[SegmentData]


# data model for generating scripts
class SlideScriptData(BaseModel):
    slide_number: int
    slide_content: str
    script: str


class VideoScript(BaseModel):
    slide_scripts: list[SlideScriptData]


def copy_text_to_clipboard(text: str):
    import subprocess
    import platform

    _os = platform.system()

    logger.info(f"copy_text_to_clipboard::{_os}")

    if _os == "Linux":
        subprocess.Popen(["/bin/sh", "-c", f'echo "{text}" | xsel --clipboard --input'])
        return
    if _os == "Darwin":
        subprocess.run("pbcopy", text=True, input=text)
        return
    raise NotImplementedError(
        f"copy_text_to_clipboard not implemented for {_os}. Please implement it."
    )


def gen_video_script(
    prompt_path: Path,
    research_path: Path,
    slides_path: Path,
) -> VideoScript:
    topic = "what is quant trading?"
    sys_prompt = PromptUtils.build_gen_script_prompt(
        gen_script_prompt_path=prompt_path,
        topic=topic,
        slides_qmd_path=slides_path,
    )
    p = parse_schema_with_llm(
        VideoScript,
        system_prompt=sys_prompt,
        model="gpt-4o",
    )
    return p
    with (
        open(prompt_path, "r") as f,
        open(research_path, "r") as f_research,
        open(slides_path, "r") as f_slides,
    ):
        sys_prompt = f.read()
        _research = f_research.read()
        slides = f_slides.read()
        sys_prompt = sys_prompt.replace("{{TOPIC}}", topic)
        sys_prompt = sys_prompt.replace("{{SLIDES}}", slides)

        p = parse_schema_with_llm(
            VideoScript,
            system_prompt=sys_prompt,
            model="gpt-4o",
        )
        return p


def video_to_audio(
    video_path: Path,
    audio_path: Path,
):
    """video to .wav"""
    import ffmpeg

    (
        ffmpeg.input(str(video_path))
        .output(str(audio_path), format="wav")
        .run(overwrite_output=True)
    )
    logger.info(f"Converted {video_path} to {audio_path}")


def video_script_to_audio(video_script: VideoScript):
    ref_speech = "/cache/inputs/jack_ma_speech_30s.mp3"

    # bufs = text_to_audio_parallel(
    #     lst_txt=[item.script for item in video_script.slide_scripts],
    #     prompt_speech_path=ref_speech,
    #     prompt_text=None,
    # )
    # for i, item in enumerate(video_script.slide_scripts):
    #     with open(f"slides/audio/{item.slide_number}.wav", "wb") as f:
    #         f.write(bufs[i])

    # raise NotImplementedError
    for item in video_script.slide_scripts:
        s = item.script
        buf = text_to_audio_spark_tts(s, ref_speech, None)
        with open(f"slides/audio/{item.slide_number}.wav", "wb") as f:
            f.write(buf)
    # openai's backend
    # all_script = "".join([item.script for item in video_script.slide_scripts])
    # client = get_openai_client()
    # p = Path("slides/audio/script.wav")
    # with client.audio.speech.with_streaming_response.create(
    #     model="gpt-4o-mini-tts",
    #     voice="onyx",
    #     response_format="wav",
    #     input=all_script,
    #     instructions="use a natural, conversational tone. Make it sound like a human, youtube video narrator. Podcast style",
    # ) as r:
    #     r.stream_to_file(p)


def transcribe_audio(audio_path) -> Tuple[list[Segment], TranscriptionInfo]:
    cls = modal.Cls.from_name(APP, "FasterWhisperApi")()
    return cls.infer.remote(audio_path)


def text_to_audio_parallel(
    lst_txt: list[str],
    prompt_speech_path: str,
    prompt_text: Optional[str],
) -> list[bytes]:
    tts_cls = modal.Cls.from_name(APP, "SparkTTSApi")()
    args = {
        "save_dir": "example/results",
        "prompt_speech_path": prompt_speech_path,
        "prompt_text": prompt_text,
    }
    enhance_cls = modal.Cls.from_name(APP, "TTSPipeline")()
    __bufs = []
    for buf in tts_cls.generate_tts_audio.map(
        [{**args, "text": text} for text in lst_txt],
    ):
        _buf = enhance_cls.enhance_audio.remote(in_bytes=buf)
        __bufs.append(_buf)

    return __bufs


def text_to_audio_spark_tts(
    txt: str,
    prompt_speech_path: str,
    prompt_text: Optional[str],
) -> bytes:
    cls = modal.Cls.from_name(APP, "SparkTTSApi")()
    buf = cls.generate_tts_audio.remote(
        save_dir="example/results",
        text=txt,
        prompt_speech_path=prompt_speech_path,
        prompt_text=prompt_text,
    )

    buf = enhance_audio(buf)

    return buf


def enhance_audio(audio_bytes: bytes) -> bytes:
    cls = modal.Cls.from_name(APP, "TTSPipeline")()

    return cls.enhance_audio.remote(in_bytes=audio_bytes)


def gen_slides_script(
    topic_prompt: str,
    topic_deep_research_output: str,
) -> VideoScript:
    raise NotImplementedError


def refine_transcription(orignal_text: str, segments: list[Segment]) -> list[Segment]:
    _segments = [
        SegmentData(start=s.start, end=s.end, text=s.text, id=s.id) for s in segments
    ]
    sys_prompt = (
        "given the original text and the transcribed segments, refine the transcription to matchup with the original text."
        "if no change needed for specific segment, skip it."
        f"original text: {orignal_text}"
        f"transcribed segments: {_segments}"
    )
    parsed = parse_schema_with_llm(
        schema_type=TranscriptionData, system_prompt=sys_prompt
    )
    _segments = parsed.segments
    # map to orignal segments
    for s in _segments:
        matched = next((x for x in segments if x.id == s.id), None)
        if not matched:
            continue
        matched.text = s.text
    return segments


def text_to_audio(txt: str) -> bytes:
    """text to audio bytes .wav"""
    logger.info(f"generating audio for {txt}")
    cls = modal.Cls.from_name(APP, "TTSPipeline")()
    return cls.tts.remote(txt)


def vid_to_vertical(vid_path: Path, output_path: Path):
    """
    Convert a video to vertical 9:16 format with background blur effect.

    Args:
        vid_path (Path): Path to the input video file
        output_path (Path): Path where the converted vertical video will be saved

    The function:
    1. Creates a blurred background by scaling the video to fill vertically
    2. Overlays the original video in the center
    3. Outputs a 9:16 aspect ratio video
    """
    import subprocess
    import ffmpeg

    # Ensure output directory exists
    output_path.parent.mkdir(parents=True, exist_ok=True)

    # Get input video dimensions
    probe = ffmpeg.probe(str(vid_path))
    video_info = next(
        stream for stream in probe["streams"] if stream["codec_type"] == "video"
    )
    width = int(video_info["width"])
    height = int(video_info["height"])

    # Calculate dimensions for 9:16 output
    # If input is already vertical, use as is
    if height > width:
        out_width = width
        out_height = int(width * (16 / 9))
    else:
        # For landscape videos, calculate the output size preserving content
        out_height = height
        out_width = int(height * (9 / 16))

    # Create filter complex for the effect
    filter_complex = (
        # Background: enlarged and blurred version of the input
        f"[0:v]scale={out_width * 3}:{out_height},crop={out_width}:{out_height},boxblur=20:8[bg];"
        # Foreground: original video scaled to fit in the vertical frame
        f"[0:v]scale='min({out_width},iw)':'min({out_height},ih)':force_original_aspect_ratio=decrease[fg];"
        # Overlay the original on top of the blurred background
        f"[bg][fg]overlay=(W-w)/2:(H-h)/2[outv]"
    )

    # Run the ffmpeg command
    cmd = [
        "ffmpeg",
        "-i",
        str(vid_path),
        "-filter_complex",
        filter_complex,
        "-map",
        "[outv]",
        "-c:v",
        "libx264",
        "-preset",
        "medium",
        "-crf",
        "23",
        # Copy audio if available
        "-c:a",
        "aac",
        "-b:a",
        "128k",
        # Handle audio absence gracefully
        "-shortest",
        str(output_path),
        "-y",
    ]

    subprocess.run(cmd, check=True)

    logger.info(f"Converted video saved to {output_path}")


def img_to_vid(
    img_dir: Path,
    output_path: Path,
    audio_dir: Path,
    speedup: float = 1.0,
    fps: int = 10,
    output_width: int = 1080,
    output_height: int = 1920,
):
    if speedup < 0.5 or speedup > 2.0:
        raise ValueError("Speed factor must be between 0.5 and 2.0")

    img_files: list[Path] = []
    for f in img_dir.iterdir():
        # Allow common image formats, not just png
        if f.is_file() and f.suffix.lower() in [".png", ".jpg", ".jpeg"]:
            try:
                # Ensure filenames are sortable integers
                int(f.stem)
                img_files.append(f)
            except ValueError:
                logger.warning(f"Skipping non-integer named image file: {f}")
        elif f.is_file():
            logger.warning(f"Skipping non-image file: {f}")

    if not img_files:
        raise ValueError(
            f"No valid image files (e.g., 0.png, 1.png) found in {img_dir}"
        )

    img_files.sort(key=lambda x: int(x.stem))

    ffmpeg_inputs = []
    filter_chains = []
    video_concat_inputs = []
    audio_concat_inputs = []
    input_index = 0
    cover_audio_offset = 2.5 / speedup  # Adjust offset based on speed

    # Process first slide (cover) separately
    if img_files:
        cover_img = img_files[0]
        # Add cover image input
        ffmpeg_inputs.extend(
            [
                "-loop",
                "1",
                "-framerate",
                str(fps),
                "-t",
                str(cover_audio_offset),
                "-i",
                str(cover_img),
            ]
        )
        # Scale filter for cover image
        filter_chains.append(
            f"[{input_index}:v]scale={output_width}:{output_height}:force_original_aspect_ratio=decrease,pad={output_width}:{output_height}:(ow-iw)/2:(oh-ih)/2,setsar=1[v{input_index}]"
        )
        video_concat_inputs.append(f"[v{input_index}]")
        input_index += 1
    else:
        raise ValueError("Image list is empty after filtering.")

    # Process remaining slides
    for img in img_files[1:]:
        idx = int(img.stem)
        audio_file = audio_dir / f"{idx}.wav"
        if not audio_file.exists():
            raise ValueError(f"Audio file not found: {audio_file} for image {img}")

        # Get original duration and adjust for speed
        try:
            original_duration = get_duration(audio_file)
        except (subprocess.CalledProcessError, json.JSONDecodeError, KeyError) as e:
            raise ValueError(f"Could not get duration for audio file {audio_file}: {e}")

        adjusted_duration = original_duration / speedup
        img_input_duration = adjusted_duration

        # For slide 1, adjust duration based on cover offset
        if idx == 1:
            img_input_duration = adjusted_duration - cover_audio_offset
            if img_input_duration <= 0:
                raise ValueError(
                    f"Cover offset ({cover_audio_offset:.2f}s) is longer than or equal to the first slide's adjusted audio duration ({adjusted_duration:.2f}s). Cannot create video."
                )

        # Add image input
        ffmpeg_inputs.extend(
            [
                "-loop",
                "1",
                "-framerate",
                str(fps),
                "-t",
                str(img_input_duration),
                "-i",
                str(img),
            ]
        )
        current_img_input_index = input_index
        # Scale filter for current image
        filter_chains.append(
            f"[{current_img_input_index}:v]scale={output_width}:{output_height}:force_original_aspect_ratio=decrease,pad={output_width}:{output_height}:(ow-iw)/2:(oh-ih)/2,setsar=1[v{current_img_input_index}]"
        )
        video_concat_inputs.append(f"[v{current_img_input_index}]")
        input_index += 1

        # Add audio input
        ffmpeg_inputs.extend(["-i", str(audio_file)])
        current_audio_input_index = input_index
        audio_tag = f"a{current_audio_input_index}"
        # Apply speed adjustment filter if needed
        if speedup != 1.0:
            filter_chains.append(
                f"[{current_audio_input_index}:a]atempo={speedup}[{audio_tag}]"
            )
        else:
            # Use anull filter as a passthrough if no speed change
            filter_chains.append(f"[{current_audio_input_index}:a]anull[{audio_tag}]")
        audio_concat_inputs.append(f"[{audio_tag}]")
        input_index += 1

    # Construct the filter complex string
    video_concat_str = "".join(video_concat_inputs)
    audio_concat_str = "".join(audio_concat_inputs)
    num_images = len(video_concat_inputs)
    num_audio = len(audio_concat_inputs)

    if num_images == 0:
        raise ValueError("No video streams generated.")

    # Add concatenation filters to the chain
    filter_chains.append(f"{video_concat_str}concat=n={num_images}:v=1:a=0[vout]")
    if num_audio > 0:
        filter_chains.append(f"{audio_concat_str}concat=n={num_audio}:v=0:a=1[aout]")

    filter_complex_str = ";".join(filter_chains)

    # Define output options
    output_options = [
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",  # QuickTime compatibility
        "-preset",
        "medium",
        "-crf",
        "23",
        "-r",
        str(fps),  # Output frame rate
        "-s",
        f"{output_width}x{output_height}",
        "-movflags",
        "+faststart",  # Optimize for web streaming
    ]

    map_options = ["-map", "[vout]"]  # Always map video

    if num_audio > 0:
        output_options.extend(["-c:a", "aac", "-b:a", "128k"])
        map_options.extend(["-map", "[aout]"])
    else:
        # If no audio, explicitly disable audio recording
        output_options.extend(["-an"])

    # Construct the full ffmpeg command
    ffmpeg_cmd = (
        ["ffmpeg"]
        + ffmpeg_inputs
        + ["-filter_complex", filter_complex_str]
        + map_options
        + output_options
        + [str(output_path), "-y"]  # Overwrite output
    )

    # Execute the command
    logger.info(f"Running ffmpeg command:\n{' '.join(ffmpeg_cmd)}")
    try:
        process = subprocess.run(ffmpeg_cmd, check=True, capture_output=True, text=True)
        logger.info(f"FFmpeg stdout:\n{process.stdout}")
        logger.info(f"FFmpeg stderr:\n{process.stderr}")
        logger.info(
            f"Successfully created video at {output_path} with dimensions {output_width}x{output_height}"
        )
    except subprocess.CalledProcessError as e:
        logger.error(f"FFmpeg command failed with exit code {e.returncode}")
        logger.error(f"FFmpeg stdout:\n{e.stdout}")
        logger.error(f"FFmpeg stderr:\n{e.stderr}")
        raise RuntimeError(f"FFmpeg command failed: {e.stderr}") from e


def map_pdf_to_png(pdf_path: Path, output_dir: Path):
    """convert a pdf -> map to png images"""
    import shutil

    import fitz

    if output_dir.exists():
        shutil.rmtree(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    doc = fitz.open(pdf_path)
    zoom = 4
    mat = fitz.Matrix(zoom, zoom)
    for i in range(len(doc)):
        page = doc.load_page(i)
        pix = page.get_pixmap(matrix=mat)  # type: ignore
        output_path = output_dir / f"{i}.png"
        pix.save(output_path)

    doc.close()


def get_video_dimensions(video_path) -> Tuple[int, int]:
    import subprocess
    import json

    command = [
        "ffprobe",
        "-v",
        "error",
        "-select_streams",
        "v:0",
        "-show_entries",
        "stream=width,height",
        "-of",
        "json",
        video_path,
    ]

    result = subprocess.run(
        command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True
    )
    info = json.loads(result.stdout)

    width = info["streams"][0]["width"]
    height = info["streams"][0]["height"]

    return width, height


def add_caption_to_video(
    video_path: str,
    segments: list[Segment],
    output_path: str,
    font_size: int = 100,
    cap_position: str = "bottom",
    cap_position_percent_margin: float = 0.2,
    font_name: str = "Arial Bold",
    style: Literal[
        "default", "textured_shadow"
    ] = "textured_shadow",  # Add style parameter
) -> str:
    import subprocess
    import os
    import tempfile

    temp_dir = os.path.join(os.getcwd(), "tmp")
    os.makedirs(temp_dir, exist_ok=True)

    def format_time(seconds: float) -> str:
        """Format seconds to ASS time format (h:mm:ss.cc)"""
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        secs = seconds % 60
        centiseconds = int((secs % 1) * 100)
        secs = int(secs)
        return f"{hours}:{minutes:02d}:{secs:02d}.{centiseconds:02d}"

    w, h = get_video_dimensions(video_path)
    logger.info(f"{w}x{h}")
    margin_v = int(h * cap_position_percent_margin)

    if cap_position == "top":
        alignment = 8  # Top-center alignment
    elif cap_position == "middle":
        alignment = 5  # Middle-center alignment
        margin_v = 0  # No margin needed for middle
    else:  # bottom (default)
        alignment = 2  # Bottom-center alignment

    # Define different style configurations
    styles = {
        "default": {
            "name": "TikTok",
            "primary_color": "&H00FFFFFF",  # White text
            "outline_color": "&H00000000",  # Black outline
            "back_color": "&H80000000",  # Semi-transparent background
            "bold": "-1",  # Bold
            "outline": "6",  # Outline thickness
            "shadow": "0",  # No shadow
            "blur": "0",  # No blur
            "inline_style_override": "",  # No style override
        },
        "textured_shadow": {
            "name": "TexturedShadow",
            "primary_color": "&H00FFFFFF",  # White text
            "outline_color": "&H00000000",  # Black outline
            "back_color": "&H20000000",  # Black shadow with 75% transparency
            "bold": "-1",  # Bold
            "outline": "0",  # Thin outline
            "shadow": "5",  # Medium shadow distance
            "blur": "23",  # Some blur in the base style
            "inline_style_override": "{\\blur10\\bord1.5\\shad3}",
        },
    }

    # Use the selected style or default if not found
    selected_style = styles.get(style, styles["default"])

    # Create ASS subtitle content header
    ass_content = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {w}
PlayResY: {h}
ScaledBorderAndShadow: yes
YCbCr Matrix: TV.709

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: {selected_style["name"]},{font_name},{font_size},{selected_style["primary_color"]},&H000000FF,{selected_style["outline_color"]},{selected_style["back_color"]},{selected_style["bold"]},0,0,0,100,100,0,0,1,{selected_style["outline"]},{selected_style["shadow"]},{alignment},20,20,{margin_v},1

[Events]
Format: Layer, Start, End, Style, Text
"""

    for segment in segments:
        start_time = format_time(segment.start)
        end_time = format_time(segment.end)
        text = segment.text
        styled_text = selected_style["inline_style_override"] + text

        ass_content += f"Dialogue: 0,{start_time},{end_time},{selected_style['name']},{styled_text}\n"
    with tempfile.NamedTemporaryFile(suffix=".ass", delete=False) as temp_ass_file:
        temp_ass_path = temp_ass_file.name
        temp_ass_file.write(ass_content.encode("utf-8"))

    try:
        logger.info(
            f"Adding captions with {style} style to {video_path}, output to {output_path}"
        )
        cmd = [
            "ffmpeg",
            "-i",
            video_path,
            "-vf",
            f"ass={temp_ass_path}",
            "-c:v",
            "libx264",
            "-c:a",
            "copy",  # Copy audio if present
            "-y",  # Overwrite output file if exists
            output_path,
        ]

        subprocess.run(cmd, check=True, capture_output=True)
        logger.info("Caption addition completed successfully")
        return output_path

    except subprocess.CalledProcessError as e:
        logger.error(
            f"Error adding captions: {e.stderr.decode() if e.stderr else str(e)}"
        )
        raise
    finally:
        if os.path.exists(temp_ass_path):
            os.unlink(temp_ass_path)


def extend_video_to_match_audio_length(
    video_path: str, audio_path: str, video_out_path: str
):
    logger.info(f"extending {video_path} to match {audio_path}")
    import subprocess
    import tempfile
    import os

    from pathlib import Path

    # Get the duration of both files using ffprobe

    video_duration = get_duration(video_path)
    audio_duration = get_duration(audio_path)
    logger.info(f"Video duration: {video_duration}s, Audio duration: {audio_duration}s")

    if video_duration >= audio_duration:
        logger.info(
            "Video is already longer than or equal to audio, no extension needed"
        )
        # Just combine the video with the audio and trim to audio length
        cmd = [
            "ffmpeg",
            "-i",
            video_path,
            "-i",
            audio_path,
            "-t",
            str(audio_duration),
            "-c:v",
            "libx264",
            "-c:a",
            "aac",
            "-map",
            "0:v",
            "-map",
            "1:a",
            "-y",
            video_out_path,
        ]
        subprocess.run(cmd, check=True)
        return

    with tempfile.TemporaryDirectory() as temp_dir:
        # We need to loop the video to match audio duration
        loop_count = int(audio_duration / video_duration) + 1
        concat_file = Path(temp_dir) / "concat.txt"
        # Use absolute path for the video file
        abs_video_path = os.path.abspath(video_path)

        with open(concat_file, "w") as f:
            for _ in range(loop_count):
                # Use just the file path with proper escaping
                f.write(f"file '{abs_video_path}'\n")

        # Create the looped video
        temp_looped_video = Path(temp_dir) / "looped.mp4"
        cmd = [
            "ffmpeg",
            "-f",
            "concat",
            "-safe",
            "0",
            "-i",
            str(concat_file),
            "-c",
            "copy",
            "-y",
            str(temp_looped_video),
        ]
        subprocess.run(cmd, check=True)

        # Combine the looped video with audio and trim to audio duration
        cmd = [
            "ffmpeg",
            "-i",
            str(temp_looped_video),
            "-i",
            audio_path,
            "-t",
            str(audio_duration),
            "-c:v",
            "libx264",
            "-c:a",
            "aac",
            "-map",
            "0:v",  # Video from first input
            "-map",
            "1:a",  # Audio from second input
            "-y",
            video_out_path,
        ]
        subprocess.run(cmd, check=True)

    logger.info(
        f"Successfully extended video to match audio length at {video_out_path}"
    )


def export_quarto_pdf(qmd_path: Path):
    """Hacky way of exporting a high-qualtiy pdf from .qmd files"""
    import subprocess
    import time

    def kill_p():
        subprocess.run("lsof -ti:4848 | xargs kill -9", shell=True)

    kill_p()

    # 1. Start the Quarto preview process and capture its output
    process = subprocess.Popen(
        f"quarto preview {qmd_path} --no-browser --port 4848",
        shell=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )
    start_time = time.time()
    timeout = 10  # seconds

    while time.time() - start_time < timeout:
        if process.poll() is not None:
            raise Exception("Quarto preview process exited prematurely")

        output_line = process.stdout.readline().strip()  # type: ignore
        if output_line:
            print(f"Quarto: {output_line}")
            if "Browse at" in output_line:
                break

    print("Quarto preview process started")

    # 2. Use playwright to open the print view of the presentation
    from playwright.sync_api import sync_playwright

    try:
        idx = 0
        with sync_playwright() as p:
            browser = p.chromium.launch()
            page = browser.new_page(viewport={"width": 720, "height": 1280})

            print_url = "http://localhost:4848/"
            page.goto(print_url)
            # page.screenshot(path=f"slides/images/{idx}.png")
            # idx += 1
            # page.keyboard.press("PageDown")
            # page.wait_for_timeout(1000)
            # press E to export
            page.keyboard.press("KeyE")
            page.wait_for_timeout(1000)

            pdf_path = qmd_path.parent / "presentation.pdf"
            page.pdf(
                path=str(pdf_path),
                print_background=False,
                margin={"top": "0", "right": "0", "bottom": "0", "left": "0"},
                width="720px",
                height="1280px",
                scale=1.0,
            )
            print(f"PDF saved to: {pdf_path}")

            browser.close()
    finally:
        process.terminate()
        kill_p()


def animate_img(img_path: str, audio_path: str, width: int, height: int) -> str:
    """image2video using echomimic v1 api"""
    logger.info(f"animating {img_path} with {audio_path}")
    cls = modal.Cls.from_name(APP, "EchoMimicApi")()
    return cls.infer.remote(img_path, audio_path, width, height)


def lipsync(video_path: str, audio_path: str, video_out_path: str) -> bytes:
    """latent sync, video2video"""
    logger.info(f"lipsyncing {video_path} with {audio_path}")
    cls = modal.Cls.from_name(APP, "LatentSyncApi")()
    return cls.infer.remote(video_path, audio_path, video_out_path)
