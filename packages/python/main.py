from pathlib import Path

from src.utils import get_logger
from src.common.replicate_infra import ReplicateInfra  # noqa: F401
from src.common.media import (
    # VideoScript,
    # map_pdf_to_png,
    img_to_vid,
    # vid_to_vertical,
    # export_quarto_pdf,
    # gen_video_script,
    # video_script_to_audio,
    copy_text_to_clipboard,
    add_caption_to_video,
    transcribe_audio,
    # text_to_audio_parallel,
)
from src.common.subtitle import test_ass_builder
from src.common.prompts import PromptUtils
# from src.common.quarto import parse_qmd_slides
# from src.common.llm import parse_schema_with_gemini

logger = get_logger(__name__)


if __name__ == "__main__":
    test_ass_builder()

    raise NotImplementedError
    TOPIC = """投行交易员穿什么衣服的牌子？什么穿搭？推荐
    """
    p = PromptUtils.build_deep_research_prompt(
        base_prompt_path=Path("src/prompts/deep_research.txt"),
        topic=TOPIC,
    )
    copy_text_to_clipboard(p)
    p = PromptUtils.build_gen_slides_prompt(
        gen_slides_prompt_path=Path("src/prompts/gen_slides.txt"),
        topic=TOPIC,
        qmd_docs_path=Path("src/prompts/quarto_revealjs_docs.txt"),
        deep_research_path=Path("tmp/research.txt"),
    )
    # # script = gen_video_script(
    # #     prompt_path=Path("src/prompts/gen_script.txt"),
    # #     research_path=Path("tmp/research.txt"),
    # #     slides_path=Path("slides/what_is_quant.qmd"),
    # # )
    # export_quarto_pdf(Path("slides/demo.qmd"))
    # map_pdf_to_png(Path("slides/presentation.pdf"), Path("slides/images"))
    # parsed_slides = parse_qmd_slides(Path("slides/demo.qmd"))
    # script = VideoScript(slide_scripts=parsed_slides)
    # video_script_to_audio(script)

    # parse_schema_with_gemini()
    # compile everything together
    img_to_vid(
        Path("slides/images"),
        Path("tmp/output.mp4"),
        Path("slides/audio"),
        1.2,
    )
    source_audio_path = "/cache/inputs/output.wav"
    segments, info = transcribe_audio(source_audio_path)
    add_caption_to_video("tmp/output.mp4", segments, "tmp/output_with_subs.mp4")
    # # vid_to_vertical(Path("output.mp4"), Path("output_vertical.mp4"))
