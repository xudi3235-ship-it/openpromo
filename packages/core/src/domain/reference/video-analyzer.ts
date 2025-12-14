/**
 * Video analyzer for reference library
 * Analyzes uploaded videos to extract blueprints, keywords, and audio strategy
 * for semantic search and agent consumption.
 */

import { Binding } from "@core/helpers/api-env";
import { getGeminiClient } from "@core/providers/gemini";
import { Log } from "@core/utils/log";
import type { ContentListUnion, Part } from "@google/genai";
import { z } from "zod";
import {
  AD_ANALYST_ROLE,
  ADAPTABLE_BLUEPRINT_OUTPUT,
  CRITICAL_ANALYSIS_RULES,
  FULL_VISUAL_ANALYSIS,
  MARKETING_STRATEGY_ANALYSIS,
  PRODUCT_PRESENTATION_ANALYSIS,
} from "../agents/prompts/ad-analysis-fragments";

const log = Log.create({ namespace: "video-analyzer" });

/**
 * Schema for video analysis output.
 */
export const VideoAnalysisSchema = z.object({
  blueprint: z
    .string()
    .describe("Full spec/blueprint for the video, ultra-detailed."),
  summary: z
    .string()
    .describe(
      "2-3 sentence overview for search embedding. Focus on style, format, and effectiveness.",
    ),
  keywords: z.array(z.string()).describe("5-10 searchable keywords"),
  industries: z
    .array(z.string())
    .describe("Relevant industries: beauty, fitness, tech, fashion, etc."),
  duration: z.number().describe("Estimated duration in seconds"),
  aspectRatio: z.enum(["9:16", "16:9", "1:1"]).describe("Video aspect ratio"),
  audio: z.object({
    type: z
      .enum(["voiceover", "trending_sound", "music_only", "mixed"])
      .describe("Primary audio type"),
    mood: z.string().describe("Audio mood: energetic, chill, dramatic, etc."),
    isReusable: z
      .boolean()
      .describe("True if viral/trending sound worth extracting for reuse."),
    reasoning: z.string().describe("Why audio is or is not worth extracting"),
  }),
});

export type VideoAnalysis = z.infer<typeof VideoAnalysisSchema>;

const sysPrompt = `
<Role>
${AD_ANALYST_ROLE}

The input video is provided from top performing ads/shorts/reels that have proven engagement and conversion metrics on social media platforms either as organic content or paid ads. Our goal is to create blueprint to reverse engineer it and consolidate a blueprint spec for why it works, what's in it, and how to replciate it for other products/services/etc. 
</Role>

<Task>

Your task:
0. closely analyze the video short
1. A comprehensive blueprint/spec for replication. blueprint is extremely detailed, different shots, each shots's detais including visuals, coloring, composition, camera movements. the blueprint should be guidelines for creating similar videos instantaneous. take progressive, incremental approach, from high level structure setup to fine-grained, detailed shot-level descriptions.
2. Search metadata (summary, keywords, industries) for our reference library

</Task>


<Analysis_Guidelines>
following are some example guidelines for some specific types of videos. Non-exhasutive. Use your best judgement to produce high-quality analysis.

${MARKETING_STRATEGY_ANALYSIS}

${PRODUCT_PRESENTATION_ANALYSIS}

### KEY FRAMES FOR IMAGE GENERATION
For critical frames: timestamp, visual description, importance, image gen prompt

${FULL_VISUAL_ANALYSIS}

### VIRAL ELEMENTS
- Trend/format, shareability factors, comment bait, relatability hooks

${ADAPTABLE_BLUEPRINT_OUTPUT}

</Analysis_Guidelines>

---

## AUDIO REUSABILITY

**isReusable=true if:** trending TikTok sound, viral song, integral to format
**isReusable=false if:** generic background music, original voiceover, ambient sound

---

${CRITICAL_ANALYSIS_RULES}

### VIDEO-SPECIFIC RULES
10. Document TIMING precisely
11. IDENTIFY the audio strategy
12. Note TRANSITIONS and pacing
13. Capture TRENDING ELEMENTS`;

function videoInlineFromBuffer(buffer: ArrayBuffer): Part {
  const base64Data = Buffer.from(buffer).toString("base64");
  return {
    inlineData: {
      mimeType: "video/mp4",
      data: base64Data,
    },
  };
}

/**
 * Analyze a video from R2 reference bucket.
 * @param r2Key - The R2 object key in the reference bucket
 */
export async function analyzeReferenceVideo(
  r2Key: string,
): Promise<VideoAnalysis> {
  const env = Binding.use();
  const gemini = getGeminiClient();

  log.info("analyzing video", { r2Key });

  const object = await env.ReferenceBucket.get(r2Key);
  if (!object) {
    throw new Error(`Video not found: ${r2Key}`);
  }

  const videoBuffer = await object.arrayBuffer();
  log.info("video fetched", { r2Key, sizeBytes: object.size });

  const contents: ContentListUnion = [];
  contents.push({
    text: "Analyze this video for our reference library.",
    role: "user",
  });
  contents.push(videoInlineFromBuffer(videoBuffer));

  const response = await gemini.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: contents,
    config: {
      systemInstruction: sysPrompt,
      responseJsonSchema: z.toJSONSchema(VideoAnalysisSchema),
    },
  });

  if (!response.text) throw new Error("No response from Gemini");

  try {
    const parsed = JSON.parse(response.text);
    const validated = VideoAnalysisSchema.parse(parsed);

    log.info("video analysis complete", {
      r2Key,
      validated,
    });

    return validated;
  } catch (error) {
    log.error("failed to parse video analysis", { r2Key, error });
    throw new Error(`Failed to parse video analysis: ${error}`);
  }
}
