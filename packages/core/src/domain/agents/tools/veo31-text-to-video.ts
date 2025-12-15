/**
 * VEO 3.1 Text-to-Video tool.
 * Ported from Python: src/openai_agent/tools/veo31.py
 */

import { KieAI } from "@core/providers/kie-ai/models";
import { tool } from "@openai/agents";
import { z } from "zod";
import type { VideoGenAgentContext } from "../context";
import { defaultVeo31Config, downloadVideo, Veo31ConfigSchema } from "./utils";

const params = z.object({
  prompt: z
    .string()
    .describe(
      "Ultra-detailed text prompt for video generation. Include subject, action, style, camera motion, lighting, etc.",
    ),
  outputPath: z
    .string()
    .describe(
      "Path to save the generated video file (e.g., './tmp/output.mp4').",
    ),
  config: Veo31ConfigSchema.nullable()
    .optional()
    .describe("Video generation configuration."),
});

/**
 * VEO 3.1 Text-to-Video tool.
 * Generate a video from a text prompt.
 */
export const veo31TextToVideoTool = tool<VideoGenAgentContext>({
  name: "veo31_text_to_video",
  description: `Generate a video from a text prompt using VEO 3.1.
Creates up to 8 second videos from detailed text descriptions.
Best for: creative scenes, abstract concepts, text-driven generation.
Note: For product consistency, prefer veo31_reference_images_to_video instead.`,
  parameters: params,
  async execute(args) {
    const parsed = params.parse(args);
    const { prompt, outputPath, config } = parsed;
    const cfg = config ?? defaultVeo31Config;

    console.log(
      `[veo31_text_to_video] Generating video with prompt: ${prompt.slice(0, 100)}...`,
    );
    console.log(`[veo31_text_to_video] Config: ${JSON.stringify(cfg)}`);

    // Generate video via models API (handles task creation + polling)
    const videoUrl = await KieAI.Veo31.run({
      prompt,
      aspectRatio: cfg.aspectRatio === "16:9" ? "16:9" : "9:16",
      model: "veo3_fast",
    });

    // Download and save
    await downloadVideo(videoUrl, outputPath);

    return {
      status: "success" as const,
      videoUrl,
      outputPath,
      prompt,
    };
  },
});
