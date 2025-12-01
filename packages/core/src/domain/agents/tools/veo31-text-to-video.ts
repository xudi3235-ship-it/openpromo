/**
 * VEO 3.1 Text-to-Video tool.
 * Ported from Python: src/openai_agent/tools/veo31.py
 */

import { z } from "zod";
import { toolBuilder } from "../tool-builder";
import {
  defaultVeo31Config,
  downloadVideo,
  getKieAIClient,
  Veo31ConfigSchema,
} from "./veo31-utils";

// Parameter schema for text-to-video tool
const TextToVideoParamsSchema = z.object({
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

type TextToVideoParams = z.infer<typeof TextToVideoParamsSchema>;

/**
 * VEO 3.1 Text-to-Video tool.
 * Generate a video from a text prompt.
 */
export const veo31TextToVideoTool = toolBuilder({
  name: "veo31_text_to_video",
  description: `Generate a video from a text prompt using VEO 3.1.
Creates up to 8 second videos from detailed text descriptions.
Best for: creative scenes, abstract concepts, text-driven generation.
Note: For product consistency, prefer veo31_reference_images_to_video instead.`,
  parameters: TextToVideoParamsSchema,
  async execute(params: TextToVideoParams) {
    const { prompt, outputPath, config } = params;
    const cfg = config ?? defaultVeo31Config;

    console.log(
      `[veo31_text_to_video] Generating video with prompt: ${prompt.slice(0, 100)}...`,
    );
    console.log(`[veo31_text_to_video] Config: ${JSON.stringify(cfg)}`);

    const client = getKieAIClient();

    // Start video generation
    const generateResult = await client.veo31GenerateVideo({
      prompt,
      aspectRatio: cfg.aspectRatio === "16:9" ? "16:9" : "9:16",
      model: "veo3_fast",
      enableTranslation: true,
    });

    const taskId = generateResult.data?.taskId;
    if (!taskId) {
      return {
        status: "error",
        tool: "veo31_text_to_video",
        error: "Failed to start video generation - no task ID returned",
      };
    }

    console.log(`[veo31_text_to_video] Task started: ${taskId}`);

    // Poll until complete
    const videoUrl = await client.veo31PollUntilComplete(taskId);

    // Download and save
    await downloadVideo(videoUrl, outputPath);

    return {
      status: "success",
      tool: "veo31_text_to_video",
      output: {
        videoUrl,
        outputPath,
        taskId,
        prompt,
      },
    };
  },
});
