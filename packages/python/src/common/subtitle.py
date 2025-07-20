from dataclasses import dataclass, field
from typing import List, Tuple, Dict, Literal, Optional
from src.utils import get_logger

logger = get_logger(__name__)


# --- Helper Function (Optional but useful) ---
def format_time(seconds: float) -> str:
    """Format seconds to ASS time format (h:mm:ss.cc)"""
    if seconds < 0:
        seconds = 0
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = seconds % 60
    centiseconds = int((secs % 1) * 100)
    secs = int(secs)
    return f"{hours}:{minutes:02d}:{secs:02d}.{centiseconds:02d}"


@dataclass
class WordTiming:
    """Represents timing for a single word."""

    word: str
    start: float  # Absolute start time in seconds
    end: float  # Absolute end time in seconds


@dataclass
class Segment:
    """Represents a dialogue segment with word timings."""

    words: List[WordTiming]
    # These fields are calculated after initialization
    start: float = field(init=False)
    end: float = field(init=False)
    text: str = field(init=False)

    def __post_init__(self):
        """Calculate derived fields after initialization."""
        if not self.words:
            raise ValueError("Segment must contain at least one word.")
        # Ensure words are sorted by start time just in case they aren't
        # If you can guarantee they are always sorted, you can remove this line
        self.words.sort(key=lambda wt: wt.start)
        self.start = self.words[0].start
        self.end = self.words[-1].end
        self.text = " ".join([wt.word for wt in self.words])


# --- ASS Builder Class ---
class ASSBuilder:
    """
    Builds ASS subtitle content with support for word-level timing (karaoke effect).
    """

    def __init__(
        self,
        play_res_x: int = 1920,
        play_res_y: int = 1080,
        script_info: Optional[Dict[str, str]] = None,
    ):
        """
        Initializes the ASS builder with script info and resolution.

        Args:
            play_res_x: Video width resolution for ASS playback.
            play_res_y: Video height resolution for ASS playback.
            script_info: Optional dictionary for custom [Script Info] fields.
        """
        self.play_res_x = play_res_x
        self.play_res_y = play_res_y
        self.styles: Dict[str, str] = {}  # Stores defined style lines
        self.events: List[str] = []  # Stores defined dialogue/event lines

        # Default Script Info - can be expanded via script_info arg
        self.script_info_header = "[Script Info]"
        self.script_info_lines = [
            "ScriptType: v4.00+",
            "WrapStyle: 0",  # Recommended for precise control
            f"PlayResX: {self.play_res_x}",
            f"PlayResY: {self.play_res_y}",
            "ScaledBorderAndShadow: yes",
            "YCbCr Matrix: TV.709",  # Common for HD video
        ]
        if script_info:
            for key, value in script_info.items():
                self.script_info_lines.append(f"{key}: {value}")

        self.styles_header = "[V4+ Styles]"
        self.styles_format = "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding"

        self.events_header = "[Events]"
        self.events_format = "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text"

        # instantiate default styles
        self.add_style(
            name="PodcastHighlight",
            font_name="Arial Black",
            font_size=60,
            primary_color="&H00FFFFFF",  # Unhighlighted: White
            secondary_color="&H0000FFFF",  # Highlighted: Yellow
            outline_color="&H00000000",  # Outline: Black
            back_color="&H90000000",  # Shadow: Semi-transparent black
            bold=True,
            outline=2.5,
            shadow=1.5,
            alignment=2,  # Bottom Center
            margin_v=50,  # Margin from bottom edge
        ).add_style(
            name="TopTitle",
            font_name="Impact",
            font_size=70,
            primary_color="&H00F0F0F0",  # Light Gray
            secondary_color="&H00FFFFFF",  # White (not used for karaoke here)
            outline_color="&H00000000",  # Black
            back_color="&HA0000000",
            bold=True,
            outline=3,
            shadow=2,
            alignment=8,  # Top Center
            margin_v=80,
        )

    def add_style(
        self,
        name: str = "Default",
        font_name: str = "Arial",
        font_size: int = 100,
        primary_color: str = "&H00FFFFFF",  # White (AABBGGRR)
        secondary_color: str = "&H000000FF",  # Red (Used by karaoke)
        outline_color: str = "&H00000000",  # Black
        back_color: str = "&H80000000",  # Semi-transparent Black Shadow/Box
        bold: bool = True,
        italic: bool = False,
        underline: bool = False,
        strikeout: bool = False,
        scale_x: int = 100,
        scale_y: int = 100,
        spacing: float = 0,
        angle: float = 0,
        border_style: int = 1,  # 1=Outline+Shadow, 3=Opaque Box
        outline: float = 2,  # Outline thickness
        shadow: float = 1,  # Shadow distance
        alignment: int = 2,  # 2=Bottom Center
        margin_l: int = 10,
        margin_r: int = 10,
        margin_v: int = 10,
        encoding: int = 1,  # 1=Default (ANSI)
    ):
        """
        Adds or replaces a style definition. Karaoke effect uses PrimaryColour
        for unhighlighted text and SecondaryColour for highlighted text.

        ASS Color Format: &HAABBGGRR (AA=Alpha, BB=Blue, GG=Green, RR=Red)
                          00=Opaque, FF=Transparent
        Alignment: Numpad layout (1=BottomLeft, 2=BottomCenter, ..., 9=TopRight)
        """
        style_line = f"Style: {name},{font_name},{font_size},{primary_color},{secondary_color},{outline_color},{back_color},{'-1' if bold else '0'},{'-1' if italic else '0'},{'-1' if underline else '0'},{'-1' if strikeout else '0'},{scale_x},{scale_y},{spacing},{angle},{border_style},{outline},{shadow},{alignment},{margin_l},{margin_r},{margin_v},{encoding}"
        self.styles[name] = style_line
        logger.info(f"Added style: {name}")
        return self

    def add_dialogue_segment(
        self,
        segment: Segment,
        style_name: str = "Default",
        layer: int = 0,
        actor: str = "",
        margin_l: int = 0,  # Use 0 to default to style margin
        margin_r: int = 0,
        margin_v: int = 0,
        effect: str = "",  # e.g., scroll up; banner;
        karaoke_type: Literal["k", "K", "kf"] = "k",
    ):
        """
        Adds a dialogue line based on a Segment object, formatting text with
        word-level timing tags for karaoke effect.

        Args:
            segment: A Segment object containing WordTiming instances.
            style_name: The name of the style to apply (must be added via add_style).
            layer: ASS layer (0 is default).
            actor: Optional actor name.
            margin_l/r/v: Override style margins if > 0.
            effect: Optional ASS effect string.
            karaoke_type: 'k' (highlight duration), 'K' (same as k),
                           'kf' (highlight duration + sweeps SecondaryColour). 'kf' is common.
        """
        if style_name not in self.styles:
            logger.error(
                f"Style '{style_name}' not found. Using 'Default'. Add it using add_style()."
            )
            style_name = "Default"
            if (
                style_name not in self.styles
            ):  # Add a basic default if it's also missing
                self.add_style(name="Default")

        start_time_str = format_time(segment.start)
        end_time_str = format_time(segment.end)

        # Build the text with karaoke tags {\k<duration>}
        # Duration is in centiseconds (cs)
        ass_text_parts = []
        line_start_time = segment.start

        for i, word_timing in enumerate(segment.words):
            # Calculate duration for the \k tag
            # For the first word, duration is from line start to word end
            # For subsequent words, duration is from previous word end to current word end
            # More accurately, it should be from current word start to current word end?
            # Let's use word_end - word_start for the highlight duration.
            # The tag applies *before* the word.

            word_start = word_timing.start
            word_end = word_timing.end
            duration_s = word_end - word_start
            duration_cs = max(0, int(duration_s * 100))  # Ensure non-negative

            # Add space before word if it's not the first word
            prefix = " " if i > 0 else ""

            # Add the karaoke tag and the word
            ass_text_parts.append(
                f"{prefix}{{\\{karaoke_type}{duration_cs}}}{word_timing.word}"
            )

        full_ass_text = "".join(ass_text_parts)

        dialogue_line = f"Dialogue: {layer},{start_time_str},{end_time_str},{style_name},{actor},{margin_l},{margin_r},{margin_v},{effect},{full_ass_text}"
        self.events.append(dialogue_line)
        return self

    def get_ass_content(self) -> str:
        """
        Returns the complete ASS file content as a string.
        """
        if not self.styles:
            logger.warning("No styles defined. Adding a basic default style.")
            self.add_style(
                name="Default", font_size=48, alignment=2, margin_v=50
            )  # Example default

        content = []
        # Script Info
        content.append(self.script_info_header)
        content.extend(self.script_info_lines)
        content.append("")  # Newline

        # Styles
        content.append(self.styles_header)
        content.append(self.styles_format)
        content.extend(self.styles.values())
        content.append("")  # Newline

        # Events
        content.append(self.events_header)
        content.append(self.events_format)
        content.extend(self.events)

        return "\n".join(content)

    def write_ass_file(self, output_path: str):
        """
        Generates the ASS content and writes it to a file.
        """
        ass_content = self.get_ass_content()
        try:
            with open(output_path, "w", encoding="utf-8") as f:
                f.write(ass_content)
            logger.info(f"ASS file successfully written to {output_path}")
        except IOError as e:
            logger.error(f"Error writing ASS file to {output_path}: {e}")
            raise


# --- Example Usage ---
def test_ass_builder():
    # 1. Define word timings (replace with your actual data)
    # Timings are absolute seconds in the video
    word_timings_line1 = [
        WordTiming("This", 0.5, 0.8),
        WordTiming("is", 0.8, 1.0),
        WordTiming("a", 1.0, 1.1),
        WordTiming("test", 1.1, 1.8),
    ]
    word_timings_line2 = [
        WordTiming("Highlighting", 2.0, 2.8),
        WordTiming("words", 2.8, 3.5),
        WordTiming("one", 3.5, 3.8),
        WordTiming("by", 3.8, 4.0),
        WordTiming("one.", 4.0, 4.8),
    ]

    segment1 = Segment(word_timings_line1)
    segment2 = Segment(word_timings_line2)

    # 2. Create the ASS Builder
    builder = ASSBuilder(play_res_x=1280, play_res_y=720)

    # 3. Add Styles (Customize as needed)
    builder.add_dialogue_segment(
        # 4. Add Dialogue Segments (using word timings)
        segment1,
        style_name="PodcastHighlight",
        karaoke_type="k",
    ).add_dialogue_segment(
        segment2,
        style_name="PodcastHighlight",
        karaoke_type="k",
    )

    # Example of adding a non-karaoke line (like a title)
    # Need a dummy Segment for this, or adapt add_dialogue_segment
    # Or add a simpler add_line method if needed often
    title_segment = Segment(
        [WordTiming("Joe is Gay", 0.0, 5.0)]
    )  # Single "word" covering duration
    builder.add_dialogue_segment(
        title_segment, style_name="TopTitle", karaoke_type="k"
    )  # Use 'k' so it just appears

    # 5. Get or Write the ASS content
    ass_file_content = builder.get_ass_content()
    print("--- Generated ASS Content ---")
    print(ass_file_content)
    print("----------------------------")

    # Optionally write to a file
    output_ass_path = "tmp/output_karaoke.ass"
    builder.write_ass_file(output_ass_path)

    print("\nTo use with ffmpeg:")
    from subprocess import run

    run(
        f'ffmpeg -i tmp/latent_sync_out.mp4 -vf "ass={output_ass_path}" -c:a copy tmp/output_video_subtitles.mp4 -y',
        shell=True,
        check=True,
    )
