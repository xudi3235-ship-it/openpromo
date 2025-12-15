/**
 * Image to Detailed Prompt - for replicating ad creatives with AI generation
 * Adapted from https://x.com/alex_prompter/status/1995470595241193726
 */

import { Agent } from "@openai/agents";
import { VideoGenRealtime } from "@shared/agents";
import type { VideoGenAgentContext } from "../context";
import {
  AD_ANALYST_ROLE,
  ADAPTABLE_BLUEPRINT_OUTPUT,
  CRITICAL_ANALYSIS_RULES,
  FULL_VISUAL_ANALYSIS,
  MARKETING_STRATEGY_ANALYSIS,
  PRODUCT_PRESENTATION_ANALYSIS,
} from "../prompts/ad-analysis-fragments";

export const image2PromptSystemPrompt = `${AD_ANALYST_ROLE}

Your task: Analyze the uploaded ad image and produce a comprehensive breakdown that captures:
1. Every visual detail needed to recreate it with AI image generation
2. The marketing/persuasion elements that make it effective
3. An adaptable blueprint for promoting different products/brands

---

## OUTPUT FORMAT

Produce a structured plain-text analysis with clear section headers. Be exhaustive and specific. Avoid vague terms like "nice," "good," or "beautiful." Use precise technical terminology.

---

## ANALYSIS SECTIONS

### 1. OVERVIEW
- Image type: photograph / digital art / illustration / 3D render / graphic design / UGC-style / mixed media
- Ad format: static feed ad / story ad / carousel frame / product shot / lifestyle shot / before-after / testimonial / meme-style
- Platform fit: which platforms this style works best for (Instagram feed, TikTok, Facebook, Pinterest, etc.)
- Confidence level: high / medium / low (your assessment of analysis accuracy)

${MARKETING_STRATEGY_ANALYSIS}

${PRODUCT_PRESENTATION_ANALYSIS}

### COMPOSITION
- Layout rule: rule of thirds / golden ratio / center composition / symmetry / asymmetry
- Aspect ratio: describe or estimate (e.g., 3:2, 16:9, 9:16 vertical, square)
- Focal points: primary and secondary, with exact positions (e.g., "subject's eyes at upper-left third intersection")
- Visual hierarchy: how the eye moves through the image
- Text-image balance: ratio of text overlay to image space
- Negative space: how it's used, where it exists
- Safe zones: content placement relative to platform UI overlays (profile icons, like buttons, etc.)
- Balance: symmetric / asymmetric / radial

${FULL_VISUAL_ANALYSIS}

### ARTISTIC CONTEXT
- Genre: commercial / UGC / testimonial / product / lifestyle / meme / educational
- Influences: any identifiable ad styles, trends, or viral formats (e.g., "talking head TikTok", "before-after", "POV")
- Mood: energetic / calm / dramatic / playful / sophisticated / raw / urgent
- Atmosphere: overall emotional impact
- Visual style: clean / cluttered / minimal / busy / organic / geometric / native-platform

---

## FINAL OUTPUT

### RECREATION PROMPT
A detailed, single-paragraph prompt (150-300 words) that could recreate this image with AI. Include all critical details: subject description, pose, expression, clothing, hair, lighting setup, background, colors, style, text overlays, and technical qualities.

${ADAPTABLE_BLUEPRINT_OUTPUT}

### KEYWORDS
10-15 comma-separated keywords for the image style and ad format

### TECHNICAL SETTINGS
Recommended camera/render settings (focal length, aperture, lighting setup) for recreation

### POST-PROCESSING NOTES
Color grading, filters, text overlay style, or editing techniques visible

---

${CRITICAL_ANALYSIS_RULES}`;

/**
 *
 * agent for transforming ads image to excutable prompt.
 */
export function createImageToPromptAgent() {
  const agent = new Agent<VideoGenAgentContext, VideoGenRealtime.AgentOutput>({
    name: "ImageToPromptAgent",
    model: "gpt-5.1",
    modelSettings: {
      reasoning: {
        effort: "low",
        summary: "auto",
      },
    },
    instructions: (args) => {
      console.log("createImageToPromptAgent - args:", args);
      return image2PromptSystemPrompt;
    },
    tools: [],
    // @ts-expect-error weird zod typing issue
    outputType: VideoGenRealtime.AgentOutput,
  });
  return agent;
}
