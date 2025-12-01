/**
 * VEO 3.1 Video Extension tool.
 * Ported from Python: src/openai_agent/tools/veo31.py
 */

import { z } from "zod";
import { toolBuilder } from "../tool-builder";
import {
  downloadVideo,
  getKieAIClient,
  Veo31ConfigSchema,
} from "./veo31-utils";

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
export const veo31VideoExtensionTool = toolBuilder({
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

    const client = getKieAIClient();

    // Start video extension
    const extendResult = await client.veo31ExtendVideo({
      taskId: inputVideoTaskId,
      prompt,
    });

    const taskId = extendResult.data?.taskId;
    if (!taskId) {
      return {
        status: "error",
        tool: "veo31_video_extension",
        error: "Failed to start video extension - no task ID returned",
      };
    }

    console.log(`[veo31_video_extension] Extension task started: ${taskId}`);

    // Poll until complete
    const videoUrl = await client.veo31PollUntilComplete(taskId);

    // Download and save
    await downloadVideo(videoUrl, outputPath);

    return {
      status: "success",
      tool: "veo31_video_extension",
      output: {
        videoUrl,
        outputPath,
        taskId,
        prompt,
        originalTaskId: inputVideoTaskId,
      },
    };
  },
});
