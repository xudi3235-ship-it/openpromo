from pathlib import Path


class PromptUtils:
    """build prompts from fs"""

    @staticmethod
    def build_gen_slides_prompt(
        gen_slides_prompt_path: Path,
        qmd_docs_path: Path,
        topic: str,
        deep_research_path: Path,
    ) -> str:
        """prompt for generating slides"""
        with (
            open(gen_slides_prompt_path, "r") as base_f,
            open(qmd_docs_path, "r") as qmd_f,
            open(deep_research_path, "r") as research_f,
        ):
            return (
                base_f.read()
                .replace("{{TOPIC}}", topic)
                .replace("{{DEEP_RESEARCH}}", research_f.read())
                .replace("{{QMD_DOCS}}", qmd_f.read())
            )

    @staticmethod
    def build_gen_script_prompt(
        gen_script_prompt_path: Path, topic: str, slides_qmd_path: Path
    ) -> str:
        """prompt for generating script"""
        with (
            open(gen_script_prompt_path, "r") as base_f,
            open(slides_qmd_path, "r") as qmd_f,
        ):
            return (
                base_f.read()
                .replace("{{TOPIC}}", topic)
                .replace("{{SLIDES}}", qmd_f.read())
            )

    @staticmethod
    def build_deep_research_prompt(
        base_prompt_path: Path,
        topic: str,
    ) -> str:
        """prompt for deep research"""
        with open(base_prompt_path, "r") as f:
            return f.read().replace("{{TOPIC}}", topic)
