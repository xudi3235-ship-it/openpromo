def create_thumbnail(text, output_path="thumbnail.png"):
    from PIL import Image, ImageDraw, ImageFont
    import textwrap

    img_width, img_height = 1920, 1080
    font_size = 200
    padding = 50  # Add some padding from the edges
    max_text_width = img_width - 2 * padding

    img = Image.new("RGB", (img_width, img_height), color="white")
    draw = ImageDraw.Draw(img)
    font = ImageFont.truetype(
        "assets/fonts/DouyinSansBold.ttf",
        size=font_size,  # Adjust font size as needed
    )

    # Estimate average character width (this is approximate)
    avg_char_width = (
        sum(
            font.getlength(char)
            for char in "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
        )
        / 62
    )
    # Calculate max characters per line based on estimated width
    max_chars_per_line = (
        int(max_text_width / avg_char_width) if avg_char_width > 0 else 10
    )  # Fallback if avg_char_width is 0

    # Wrap text
    wrapped_text = textwrap.wrap(text, width=max_chars_per_line)

    # Calculate text block height
    lines = []
    line_heights = []
    for line in wrapped_text:
        # Use getbbox for more accurate line dimensions if needed, especially with varying char heights
        # For simplicity, using a fixed line spacing based on font size
        lines.append(line)
        # Rough estimate of line height, adjust multiplier as needed
        line_heights.append(font.size * 1.2)

    total_text_height = sum(line_heights)

    # Calculate starting y position to center the text block vertically
    current_y = (img_height - total_text_height) / 2

    # Draw each line
    for i, line in enumerate(lines):
        # Calculate text width for centering horizontally
        line_width = font.getlength(line)
        current_x = (img_width - line_width) / 2
        draw.text((current_x, current_y), line, font=font, fill="black", align="left")
        current_y += line_heights[i]  # Move y down for the next line

    img.save(output_path)
    print(f"Thumbnail saved at {output_path}")
