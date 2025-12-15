import fs from "node:fs";
import { getGeminiClient } from "@core/providers/gemini";
import { isStringUrl } from "@core/utils/common";
import { type ContentListUnion, ThinkingLevel } from "@google/genai";
import { tool } from "@openai/agents";
import z from "zod";
import type { VideoGenAgentContext } from "../context";
import {
  AD_ANALYST_ROLE,
  ADAPTABLE_BLUEPRINT_OUTPUT,
  CRITICAL_ANALYSIS_RULES,
  FULL_VISUAL_ANALYSIS,
  MARKETING_STRATEGY_ANALYSIS,
  PRODUCT_PRESENTATION_ANALYSIS,
} from "../prompts/ad-analysis-fragments";
import { downloadImagesToTmp, downloadVideosToTmp } from "../utils";

const toolParams = z.object({
  videoUrlOrPath: z.string().describe("Path or URL to the input video file."),
  context: z.string().describe("additional context"),
  productImagePaths: z
    .string()
    .array()
    .describe("list of product images, file or url that biz is selling"),
});

const specSchema = z.object({
  blueprint: z.string().describe("Overall blueprint/spec for the video"),
  extra: z.string().describe("Any extra notes or comments"),
});

const sysPrompt = `${AD_ANALYST_ROLE}

Your task: Analyze the uploaded video ad/short and produce a comprehensive spec/blueprint that captures:
1. The structure, pacing, and shot breakdown for replication
2. The marketing/persuasion elements that make it effective
3. Visual details for each key frame to guide AI image generation
4. An adaptable blueprint for promoting different products/brands

Our north star is to use this blueprint to create viral social media ads for small businesses to grow social presence and sales.

---

## OUTPUT FORMAT

Produce a structured plain-text analysis. Be exhaustive and specific. The spec will be used by downstream agents to generate keyframe images and compose video.

---

## ANALYSIS SECTIONS

### 1. OVERVIEW
- Video type: UGC / talking head / product demo / testimonial / meme / trending format / story-driven / montage
- Duration: estimated length in seconds
- Aspect ratio: 9:16 vertical / 16:9 horizontal / 1:1 square
- Platform fit: TikTok / Instagram Reels / YouTube Shorts / Facebook
- Pacing: fast cuts / medium / slow and deliberate
- Confidence level: high / medium / low

### 2. VIDEO STRUCTURE

#### Hook (first 1-3 seconds)
- Opening frame description: what viewer sees immediately
- Hook type: question / bold claim / visual surprise / relatable moment / trending sound
- Text overlay: exact wording if present
- Why it stops the scroll: the specific element that captures attention

#### Body (middle section)
- Number of distinct shots/scenes
- Shot-by-shot breakdown with:
  - Duration (approximate seconds)
  - Shot type: close-up / medium / wide / POV / screen recording / B-roll
  - Action: what happens in this shot
  - Text overlay: any on-screen text
  - Transition: cut / swipe / zoom / none

#### Ending/CTA
- Final frame description
- CTA type: verbal / text overlay / implied / product shot
- CTA text: exact wording
- End screen elements: logo, handle, product, offer

### 3. AUDIO ANALYSIS
- Audio type: voiceover / trending sound / original audio / music only / mixed
- Voiceover style: casual / professional / excited / ASMR / storytelling
- Key audio moments: sound effects, beat drops, audio cues synced to visuals
- Music mood: energetic / chill / dramatic / funny / emotional
- Captions: auto-generated style / designed / none

${MARKETING_STRATEGY_ANALYSIS}

${PRODUCT_PRESENTATION_ANALYSIS}

### KEY FRAMES FOR IMAGE GENERATION
For each critical frame that needs to be generated, provide:
- Frame number and timestamp
- Detailed visual description (use the visual analysis format below)
- Why this frame is important to the video's success
- Image generation prompt (150-200 words)

${FULL_VISUAL_ANALYSIS}

### VIRAL ELEMENTS
- Trend/format being used: identify if this follows a known format (e.g., "Get Ready With Me", "POV", "Day in my life", "Before/After")
- Shareability factors: what makes people want to share this
- Comment bait: elements designed to drive comments
- Relatability hooks: "this is so me" moments
- Controversy/opinion triggers: if any

${ADAPTABLE_BLUEPRINT_OUTPUT}

---

${CRITICAL_ANALYSIS_RULES}

### ADDITIONAL VIDEO-SPECIFIC RULES
10. Document TIMING precisely — frame-by-frame breakdown matters for video
11. IDENTIFY the audio strategy — sound is 50% of video success
12. Note TRANSITIONS and pacing — these affect the feel significantly
13. Capture TRENDING ELEMENTS — formats, sounds, styles that are currently viral`;

function _imgInline(path: string) {
  const base64Data = fs.readFileSync(path, { encoding: "base64" });
  return {
    inlineData: {
      mimeType: "image/jpeg",
      data: base64Data,
    },
  };
}
function videoInline(path: string) {
  const base64Data = fs.readFileSync(path, { encoding: "base64" });
  return {
    inlineData: {
      mimeType: "video/mp4",
      data: base64Data,
    },
  };
}

async function transformVideoToSpec({
  videoUrlOrPath: videoPath,
  productImagePaths,
  context,
}: z.infer<typeof toolParams>) {
  const gemini = getGeminiClient();
  const uploadedFile = await gemini.files.upload({
    file: videoPath,
    config: {
      mimeType: "video/mp4",
    },
  });
  console.log("Uploaded video file:", uploadedFile);

  if (isStringUrl(videoPath)) {
    // download
    videoPath = (await downloadVideosToTmp([videoPath], "/tmp"))[0];
  }

  const contents: ContentListUnion = [];

  // 1. input video
  contents.push({
    text: `here is the ad/video to analyze`,
    role: "user",
  });
  contents.push(videoInline(videoPath));

  // 2. product images
  contents.push({
    text: `here are the product images for my product/business`,
    role: "user",
  });
  const localImagePaths = await downloadImagesToTmp(
    productImagePaths.filter(isStringUrl),
    "/tmp",
  );
  for (const imgPath of localImagePaths) {
    contents.push(_imgInline(imgPath));
  }
  // 3. additional context
  contents.push({
    text: `here is the additional context for this run: ${context}`,
    role: "user",
  });

  const response = await gemini.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: contents,
    config: {
      systemInstruction: sysPrompt,
      responseMimeType: "application/json",
      responseJsonSchema: z.toJSONSchema(specSchema), // TODO: check to ensure this work with zod v4
      thinkingConfig: {
        thinkingLevel: ThinkingLevel.THINKING_LEVEL_UNSPECIFIED,
      },
    },
  });

  console.log("Video spec analysis response:", response.text);

  if (!response.text) {
    console.error("No response text received from Gemini.");
    return `No response from gemini api`;
  }

  try {
    const parsed = JSON.parse(response.text);
    return specSchema.parse(parsed);
  } catch (error) {
    console.error("Failed to parse response:", error);
    return `Failed to parse response: ${error}`;
  }
}

export const videoToSpecTool = tool<VideoGenAgentContext, VideoGenAgentContext>(
  {
    name: "video_to_spec",
    description:
      "takes in a social media video ad, analyzes it, and produces a comprehensive spec/blueprint that can be used to replicate the video effectively for promoting products/services/brands for small businesses.",
    parameters: toolParams,
    isEnabled(args) {
      const context = args.runContext.context as VideoGenAgentContext;
      return context.stage === "video_gen";
    },
    execute: async (args: z.infer<typeof toolParams>) => {
      return await transformVideoToSpec(args);
    },
  },
);
