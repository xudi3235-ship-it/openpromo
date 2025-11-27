"""Veo 3.1 unified video generation tools.

This module provides a unified interface for Veo 3.1 video generation
with support for multiple providers (Google Gemini and Kie AI).
"""

from .models import (
    GenerationMode,
    UnifiedConfigParams,
    VideoGenerationResult,
    VideoProvider,
)
from .router import generate_video
from .tools import (
    veo31_generate_video,
    veo31_image_to_video,
    veo31_reference_images_to_video,
    veo31_text_to_video,
    veo31_video_extension,
)

__all__ = [
    # Models
    "VideoProvider",
    "GenerationMode",
    "UnifiedConfigParams",
    "VideoGenerationResult",
    # Router (for programmatic use)
    "generate_video",
    # Function tools (for OpenAI agents)
    "veo31_generate_video",
    "veo31_text_to_video",
    "veo31_image_to_video",
    "veo31_video_extension",
    "veo31_reference_images_to_video",
]
