/**
 * VEO 3.1 Video Extension tool.
 * Ported from Python: src/openai_agent/tools/veo31.py
 */

import { KieAI } from "@core/providers/kie-ai/models";
import { z } from "zod";
import type { VideoGenAgentContext } from "../context";
import { toolBuilder, toolSuccess } from "../tool-builder";
import { downloadVideo, probeDurationMs, Veo31ConfigSchema } from "./utils";

// Parameter schema for video-extension tool
const VideoExtensionParamsSchema = z.object({
  prompt: z
    .string()
    .describe("Text prompt describing how to extend/continue the video."),
  outputPath: z.string().describe("Path to save the extended video file."),
  inputVideoTaskId: z
    .string()
    .describe("Task ID of the previously generated VEO 3.1 video to extend."),
  config: Veo31ConfigSchema.nullable()
    .optional()
    .describe("Video generation configuration."),
});

type VideoExtensionParams = z.infer<typeof VideoExtensionParamsSchema>;

/**
 * VEO 3.1 Video Extension tool.
 * Extend an existing VEO 3.1 video.
 */
export const veo31VideoExtensionTool = toolBuilder<
  "veo31_video_extension",
  typeof VideoExtensionParamsSchema,
  VideoGenAgentContext
>({
  name: "veo31_video_extension",
  description: `Extend an existing VEO 3.1 video by 7 seconds.
The input must be a previous VEO 3.1 generated video (via task ID).
Can extend up to 20 times, creating videos up to ~148 seconds.
Best for: making longer videos, continuing a scene, seamless extensions.`,
  parameters: VideoExtensionParamsSchema,
  async execute(params: VideoExtensionParams) {
    const { prompt, outputPath, inputVideoTaskId } = params;

    console.log(`[veo31_video_extension] Extending video: ${inputVideoTaskId}`);
    console.log(
      `[veo31_video_extension] Extension prompt: ${prompt.slice(0, 100)}...`,
    );

    // Extend via models API (handles task creation + polling)
    const videoUrl = await KieAI.Veo31.extend({
      taskId: inputVideoTaskId,
      prompt,
    });

    // Download and save
    const [_, durationMs] = await Promise.all([
      downloadVideo(videoUrl, outputPath),
      probeDurationMs(videoUrl),
    ]);

    return toolSuccess("veo31_video_extension", {
      videoUrl,
      outputPath,
      prompt,
      originalTaskId: inputVideoTaskId,
      durationMs,
    });
  },
});
