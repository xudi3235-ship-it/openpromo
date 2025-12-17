/**
 * VEO 3.1 Video Extension tool.
 * Ported from Python: src/openai_agent/tools/veo31.py
 */

import { KieAI } from "@core/providers/kie-ai/models";
import { tool } from "@openai/agents";
import { z } from "zod";
import type { VideoGenAgentContext } from "../context";
import { VideoGenAgent } from "../video-gen-agent";
import { downloadVideo, probeDurationMs, Veo31ConfigSchema } from "./utils";

const params = z.object({
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

/**
 * VEO 3.1 Video Extension tool.
 * Extend an existing VEO 3.1 video.
 */
export const veo31VideoExtensionTool = tool<VideoGenAgentContext>({
  name: "veo31_video_extension",
  description: `Extend an existing VEO 3.1 video by 7 seconds.
The input must be a previous VEO 3.1 generated video (via task ID).
Can extend up to 20 times, creating videos up to ~148 seconds.
Best for: making longer videos, continuing a scene, seamless extensions.`,
  parameters: params,
  async execute(args) {
    const parsed = params.parse(args);
    const { prompt, outputPath, inputVideoTaskId } = parsed;

    console.log(`[veo31_video_extension] Extending video: ${inputVideoTaskId}`);
    console.log(
      `[veo31_video_extension] Extension prompt: ${prompt.slice(0, 100)}...`,
    );

    // Create optimistic artifact entry for the extension task
    VideoGenAgent.updateVideoArtifact({
      id: inputVideoTaskId,
      videoUrl: "",
      state: "processing",
      progressPercent: null,
    });
    VideoGenAgent.onProgressUpdate((draft) => {
      draft.logs.push(`Extending task: ${inputVideoTaskId}`);
    });

    // Extend via models API (handles task creation + polling)
    const videoUrl = await KieAI.Veo31.extend({
      taskId: inputVideoTaskId,
      prompt,
    });

    VideoGenAgent.updateVideoArtifact({
      id: videoUrl,
      videoUrl,
      state: "ready",
      progressPercent: 100,
    });

    const [_, durationMs] = await Promise.all([
      downloadVideo(videoUrl, outputPath),
      probeDurationMs(videoUrl),
    ]);

    return {
      status: "success" as const,
      videoUrl,
      outputPath,
      prompt,
      originalTaskId: inputVideoTaskId,
      durationMs,
    };
  },
});
