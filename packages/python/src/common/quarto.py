import re
from pathlib import Path
from .media import SlideScriptData


def parse_qmd_slides(qmd_path: Path) -> list[SlideScriptData]:
    """
    Parses a Quarto Markdown string to extract slides and speaker notes.

    Args:
        qmd_content: The string content of the .qmd file.

    Returns:
        A list of dictionaries, where each dictionary represents a slide
        and contains 'slide_number' and 'speaker_notes'.
    """

    qmd_content = qmd_path.read_text(encoding="utf-8")
    slides_data = []
    # Regex to find speaker notes block (captures content inside)
    # Handles potential spaces around the braces and dots, and multiline content
    notes_pattern = re.compile(
        r":::\s*{\s*\.notes\s*}\s*(.*?)\s*:::", re.DOTALL | re.IGNORECASE
    )

    # 1. Split the content to separate YAML front matter from the body
    parts = qmd_content.split("---", 2)
    if len(parts) < 3:
        print("Warning: Could not clearly identify YAML front matter and body.")
        body_content = qmd_content  # Assume no front matter or malformed
    else:
        body_content = parts[2]  # The part after the second '---'

    # 2. Split the body into slides using '---' as the separator
    #    Need to handle potential leading/trailing whitespace and empty strings from split
    raw_slides = body_content.split(
        "\n---"
    )  # Split by separator on its own line potentially

    slide_number = 0
    for raw_slide in raw_slides:
        cleaned_slide_content = raw_slide.strip()
        # Skip potential empty sections resulting from separators at the start/end
        if not cleaned_slide_content:
            continue

        slide_number += 1
        speaker_notes = None

        # 3. Search for speaker notes within the current slide content
        match = notes_pattern.search(cleaned_slide_content)
        if match:
            # Extract the captured group (the content) and strip whitespace
            speaker_notes = match.group(1).strip()
            # Optionally, remove the notes block from the slide content itself
            # cleaned_slide_content = notes_pattern.sub('', cleaned_slide_content).strip()
        slides_data.append(
            SlideScriptData(
                slide_number=slide_number,
                slide_content=cleaned_slide_content,
                script=speaker_notes or "",
            )
        )

    return slides_data


if __name__ == "__main__":
    parsed_slides = parse_qmd_slides(
        Path("/Users/ruizeli/Documents/dev/openpromo/packages/python/slides/demo.qmd")
    )
    for slide in parsed_slides:
        print(f"--- Slide {slide.slide_number} ---")
        print(f"Speaker Notes:\n{slide.script}\n")

    # Optional: Print total number of slides found
    print(f"Total slides found: {len(parsed_slides)}")
