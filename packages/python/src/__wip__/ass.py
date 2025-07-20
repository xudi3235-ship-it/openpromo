"""
Advanced SubStation Alpha (.ass) Subtitle Parser

This module provides functionality to read, manipulate, and write Advanced SubStation Alpha
subtitle files according to the v4.00+ specification.
"""

import re
import os
import codecs
from collections import OrderedDict
from typing import Dict, List, Any, Optional, Union, Tuple


class ASSParser:
    """Advanced SubStation Alpha subtitle parser and writer"""

    def __init__(self):
        self.script_info = OrderedDict()
        self.styles = []
        self.events = []
        self.fonts = []
        self.graphics = []
        self.style_format = []
        self.event_format = []
        self.current_section = None

    def parse_file(self, filename: str) -> bool:
        """Parse an ASS subtitle file

        Args:
            filename: Path to the .ass file

        Returns:
            True if parsing was successful, False otherwise
        """
        try:
            # Try UTF-8 first, then fallback to Latin-1
            try:
                with codecs.open(filename, "r", encoding="utf-8-sig") as f:
                    lines = f.readlines()
            except UnicodeDecodeError:
                with codecs.open(filename, "r", encoding="latin-1") as f:
                    lines = f.readlines()

            # Reset any existing data
            self.__init__()

            # Process the file line by line
            for line in lines:
                line = line.strip()
                if not line or line.startswith(";"):
                    continue

                self._parse_line(line)

            return True
        except Exception as e:
            print(f"Error parsing file: {e}")
            return False

    def _parse_line(self, line: str) -> None:
        """Parse a single line from the ASS file

        Args:
            line: A line from the ASS file
        """
        # Check for section headers
        if line.startswith("[") and line.endswith("]"):
            self.current_section = line
            return

        # Skip lines without a colon outside of a section
        if ":" not in line or self.current_section is None:
            return

        # Process line based on current section
        if self.current_section == "[Script Info]":
            key, value = line.split(":", 1)
            self.script_info[key.strip()] = value.strip()

        elif self.current_section in [
            "[V4 Styles]",
            "[V4+ Styles]",
            "[v4 Styles]",
            "[v4+ Styles]",
        ]:
            if line.startswith("Format:"):
                # Parse the style format
                self.style_format = [
                    s.strip() for s in line.split(":", 1)[1].split(",")
                ]
            elif line.startswith("Style:"):
                # Parse a style definition
                style_values = self._split_values(line.split(":", 1)[1])
                style_dict = dict(zip(self.style_format, style_values))
                self.styles.append(style_dict)

        elif self.current_section == "[Events]":
            if line.startswith("Format:"):
                # Parse the event format
                self.event_format = [
                    s.strip() for s in line.split(":", 1)[1].split(",")
                ]
            elif any(
                line.startswith(prefix)
                for prefix in [
                    "Dialogue:",
                    "Comment:",
                    "Picture:",
                    "Sound:",
                    "Movie:",
                    "Command:",
                ]
            ):
                # Parse an event
                event_type, event_data = line.split(":", 1)
                event_values = self._split_values(event_data, preserve_text=True)

                # Create a dictionary with values matching format fields
                event_dict = {"Type": event_type}
                for i, field in enumerate(self.event_format):
                    if i < len(event_values):
                        event_dict[field] = event_values[i]
                    else:
                        event_dict[field] = ""

                self.events.append(event_dict)

        elif self.current_section == "[Fonts]":
            if line.startswith("fontname:"):
                # Font definition
                font_name = line.split(":", 1)[1].strip()
                self.fonts.append({"name": font_name, "data": []})
            elif self.fonts and not line.startswith("fontname:"):
                # Font data line
                self.fonts[-1]["data"].append(line)

        elif self.current_section == "[Graphics]":
            if line.startswith("filename:"):
                # Graphic definition
                graphic_name = line.split(":", 1)[1].strip()
                self.graphics.append({"name": graphic_name, "data": []})
            elif self.graphics and not line.startswith("filename:"):
                # Graphic data line
                self.graphics[-1]["data"].append(line)

    def _split_values(self, line: str, preserve_text: bool = False) -> List[str]:
        """Split a comma-separated line while handling the special case where the last field
        (Text field in Events) can contain commas

        Args:
            line: Comma-separated line
            preserve_text: If True, preserves commas in the last field

        Returns:
            List of values from the line
        """
        values = []
        parts = line.split(",")

        if preserve_text and len(parts) > len(self.event_format):
            # For event lines, combine text components if they contain commas
            text_parts = parts[len(self.event_format) - 1 :]
            values = parts[: len(self.event_format) - 1] + [",".join(text_parts)]
        else:
            values = parts

        return [v.strip() for v in values]

    def write_file(self, filename: str) -> bool:
        """Write the subtitle data to an ASS file

        Args:
            filename: Path where the .ass file should be saved

        Returns:
            True if writing was successful, False otherwise
        """
        try:
            with codecs.open(filename, "w", encoding="utf-8-sig") as f:
                # Write Script Info section
                f.write("[Script Info]\n")
                for key, value in self.script_info.items():
                    f.write(f"{key}: {value}\n")
                f.write("\n")

                # Write Styles section
                f.write("[V4+ Styles]\n")
                f.write(f"Format: {', '.join(self.style_format)}\n")
                for style in self.styles:
                    style_values = [style.get(field, "") for field in self.style_format]
                    f.write(f"Style: {', '.join(map(str, style_values))}\n")
                f.write("\n")

                # Write Events section
                f.write("[Events]\n")
                f.write(f"Format: {', '.join(self.event_format)}\n")
                for event in self.events:
                    event_type = event.get("Type", "Dialogue")
                    event_values = [event.get(field, "") for field in self.event_format]
                    f.write(f"{event_type}: {', '.join(map(str, event_values))}\n")

                # Write Fonts section if needed
                if self.fonts:
                    f.write("\n[Fonts]\n")
                    for font in self.fonts:
                        f.write(f"fontname: {font['name']}\n")
                        for data_line in font["data"]:
                            f.write(f"{data_line}\n")

                # Write Graphics section if needed
                if self.graphics:
                    f.write("\n[Graphics]\n")
                    for graphic in self.graphics:
                        f.write(f"filename: {graphic['name']}\n")
                        for data_line in graphic["data"]:
                            f.write(f"{data_line}\n")

            return True
        except Exception as e:
            print(f"Error writing file: {e}")
            return False

    def create_default_script(self):
        """Create a default ASS script with basic settings"""
        # Set default Script Info
        self.script_info = OrderedDict(
            [
                ("Title", "Default ASS Script"),
                ("ScriptType", "v4.00+"),
                ("WrapStyle", "0"),
                ("PlayResX", "1280"),
                ("PlayResY", "720"),
                ("ScaledBorderAndShadow", "yes"),
                ("Collisions", "Normal"),
            ]
        )

        # Set default style format
        self.style_format = [
            "Name",
            "Fontname",
            "Fontsize",
            "PrimaryColour",
            "SecondaryColour",
            "OutlineColour",
            "BackColour",
            "Bold",
            "Italic",
            "Underline",
            "StrikeOut",
            "ScaleX",
            "ScaleY",
            "Spacing",
            "Angle",
            "BorderStyle",
            "Outline",
            "Shadow",
            "Alignment",
            "MarginL",
            "MarginR",
            "MarginV",
            "Encoding",
        ]

        # Add a default style
        self.styles.append(
            {
                "Name": "Default",
                "Fontname": "Arial",
                "Fontsize": "20",
                "PrimaryColour": "&HFFFFFF",  # White
                "SecondaryColour": "&H000000",  # Black
                "OutlineColour": "&H000000",  # Black
                "BackColour": "&H000000",  # Black
                "Bold": "0",
                "Italic": "0",
                "Underline": "0",
                "StrikeOut": "0",
                "ScaleX": "100",
                "ScaleY": "100",
                "Spacing": "0",
                "Angle": "0",
                "BorderStyle": "1",
                "Outline": "2",
                "Shadow": "2",
                "Alignment": "2",  # Centered
                "MarginL": "10",
                "MarginR": "10",
                "MarginV": "10",
                "Encoding": "0",
            }
        )

        # Set default event format
        self.event_format = [
            "Layer",
            "Start",
            "End",
            "Style",
            "Name",
            "MarginL",
            "MarginR",
            "MarginV",
            "Effect",
            "Text",
        ]

    def add_subtitle(
        self,
        start_time: str,
        end_time: str,
        text: str,
        style: str = "Default",
        layer: int = 0,
        name: str = "",
        effect: str = "",
    ) -> None:
        """Add a subtitle to the events list

        Args:
            start_time: Start time in format '0:00:00.00'
            end_time: End time in format '0:00:00.00'
            text: The subtitle text
            style: Style name to use
            layer: Layer number
            name: Character name
            effect: Effect to apply
        """
        subtitle = {
            "Type": "Dialogue",
            "Layer": str(layer),
            "Start": start_time,
            "End": end_time,
            "Style": style,
            "Name": name,
            "MarginL": "0",
            "MarginR": "0",
            "MarginV": "0",
            "Effect": effect,
            "Text": text,
        }
        self.events.append(subtitle)

    def add_style(
        self,
        name: str,
        font_name: str = "Arial",
        font_size: int = 20,
        primary_color: str = "&HFFFFFF",
        **kwargs,
    ) -> None:
        """Add a style to the styles list

        Args:
            name: Style name
            font_name: Font name
            font_size: Font size
            primary_color: Primary text color in ASS format (&HRRGGBB)
            **kwargs: Additional style properties
        """
        style = {
            "Name": name,
            "Fontname": font_name,
            "Fontsize": str(font_size),
            "PrimaryColour": primary_color,
            "SecondaryColour": "&H000000",
            "OutlineColour": "&H000000",
            "BackColour": "&H000000",
            "Bold": "0",
            "Italic": "0",
            "Underline": "0",
            "StrikeOut": "0",
            "ScaleX": "100",
            "ScaleY": "100",
            "Spacing": "0",
            "Angle": "0",
            "BorderStyle": "1",
            "Outline": "2",
            "Shadow": "2",
            "Alignment": "2",
            "MarginL": "10",
            "MarginR": "10",
            "MarginV": "10",
            "Encoding": "0",
        }

        # Update with provided values
        style.update({k: str(v) for k, v in kwargs.items()})
        self.styles.append(style)

    def convert_time_to_ass(
        self, hours: int, minutes: int, seconds: int, centiseconds: int
    ) -> str:
        """Convert time components to ASS time format

        Args:
            hours: Hours
            minutes: Minutes
            seconds: Seconds
            centiseconds: Centiseconds (1/100 of a second)

        Returns:
            Time in ASS format (h:mm:ss.cc)
        """
        return f"{hours}:{minutes:02d}:{seconds:02d}.{centiseconds:02d}"

    def parse_ass_time(self, time_str: str) -> Tuple[int, int, int, int]:
        """Parse ASS time format into components

        Args:
            time_str: Time in ASS format (h:mm:ss.cc)

        Returns:
            Tuple of (hours, minutes, seconds, centiseconds)
        """
        pattern = r"(\d+):(\d+):(\d+)\.(\d+)"
        match = re.match(pattern, time_str)
        if match:
            h, m, s, cs = match.groups()
            return int(h), int(m), int(s), int(cs)
        raise ValueError(f"Invalid ASS time format: {time_str}")


class ASSStyler:
    """Utility class for working with ASS style override codes"""

    @staticmethod
    def bold(text: str, enable: bool = True) -> str:
        """Apply bold formatting

        Args:
            text: Text to format
            enable: Whether to enable or disable the effect

        Returns:
            Formatted text
        """
        code = 1 if enable else 0
        return f"{{\\b{code}}}{text}{{\\b0}}"

    @staticmethod
    def italic(text: str, enable: bool = True) -> str:
        """Apply italic formatting

        Args:
            text: Text to format
            enable: Whether to enable or disable the effect

        Returns:
            Formatted text
        """
        code = 1 if enable else 0
        return f"{{\\i{code}}}{text}{{\\i0}}"

    @staticmethod
    def color(text: str, color_code: str) -> str:
        """Apply color formatting

        Args:
            text: Text to format
            color_code: Color in ASS format (&HBBGGRR&)

        Returns:
            Formatted text
        """
        return f"{{\\c{color_code}}}{text}{{\\c}}"

    @staticmethod
    def font_size(text: str, size: int) -> str:
        """Apply font size

        Args:
            text: Text to format
            size: Font size

        Returns:
            Formatted text
        """
        return f"{{\\fs{size}}}{text}{{\\fs}}"

    @staticmethod
    def position(x: int, y: int) -> str:
        """Generate position tag

        Args:
            x: X coordinate
            y: Y coordinate

        Returns:
            Position tag
        """
        return f"{{\\pos({x},{y})}}"


def demo():
    """Demonstration of the ASS parser functionality"""
    parser = ASSParser()

    # Set specific script information
    parser.script_info = OrderedDict(
        [
            ("ScriptType", "v4.00+"),
            ("PlayResX", "1080"),
            ("PlayResY", "1920"),
            ("ScaledBorderAndShadow", "yes"),
            ("YCbCr Matrix", "TV.709"),
        ]
    )

    # Set the style format
    parser.style_format = [
        "Name",
        "Fontname",
        "Fontsize",
        "PrimaryColour",
        "SecondaryColour",
        "OutlineColour",
        "BackColour",
        "Bold",
        "Italic",
        "Underline",
        "StrikeOut",
        "ScaleX",
        "ScaleY",
        "Spacing",
        "Angle",
        "BorderStyle",
        "Outline",
        "Shadow",
        "Alignment",
        "MarginL",
        "MarginR",
        "MarginV",
        "Encoding",
    ]

    # Add the TikTok style
    parser.styles.append(
        {
            "Name": "TikTok",
            "Fontname": "Arial",
            "Fontsize": "80",
            "PrimaryColour": "&H00FFFFFF",
            "SecondaryColour": "&H000000FF",
            "OutlineColour": "&H00000000",
            "BackColour": "&H80000000",
            "Bold": "-1",
            "Italic": "0",
            "Underline": "0",
            "StrikeOut": "0",
            "ScaleX": "100",
            "ScaleY": "100",
            "Spacing": "0",
            "Angle": "0",
            "BorderStyle": "1",
            "Outline": "6",
            "Shadow": "0",
            "Alignment": "2",
            "MarginL": "20",
            "MarginR": "20",
            "MarginV": "60",
            "Encoding": "1",
        }
    )

    # Set event format - simplified for this example
    parser.event_format = ["Layer", "Start", "End", "Style", "Text"]

    # Add the dialogue lines
    parser.events = [
        {
            "Type": "Dialogue",
            "Layer": "0",
            "Start": "0:00:00.50",
            "End": "0:00:03.00",
            "Style": "TikTok",
            "Text": "Hey, check this out!",
        },
        {
            "Type": "Dialogue",
            "Layer": "0",
            "Start": "0:00:03.10",
            "End": "0:00:06.00",
            "Style": "TikTok",
            "Text": "It's super cool! 😎",
        },
        {
            "Type": "Dialogue",
            "Layer": "0",
            "Start": "0:00:06.10",
            "End": "0:00:10.00",
            "Style": "TikTok",
            "Text": "Follow for more content!",
        },
    ]

    # Write the file
    parser.write_file("tiktok_subtitles.ass")
    print("Created tiktok_subtitles.ass")

    # Read it back to verify
    parser2 = ASSParser()
    if parser2.parse_file("tiktok_subtitles.ass"):
        print("Successfully read back the file.")
        print(f"Number of styles: {len(parser2.styles)}")
        print(f"Number of events: {len(parser2.events)}")

        # Print the content to verify
        print("\nFile content:")
        with open("tiktok_subtitles.ass", "r", encoding="utf-8-sig") as f:
            print(f.read())


if __name__ == "__main__":
    demo()
