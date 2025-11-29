/**
 * VEO 3.1 Reference Images to Video tool.
 * Ported from Python: src/openai_agent/tools/veo31.py
 */

import { KieAIError } from "@core/providers/kie-ai";
import { tool } from "@openai/agents";
import { z } from "zod";
import {
  downloadVideo,
  getKieAIClient,
  uploadFiles,
  Veo31ConfigSchema,
} from "./veo31-utils";

// Parameter schema for reference-images-to-video tool
const ReferenceImagesToVideoParamsSchema = z.object({
  prompt: z
    .string()
    .describe("Text prompt describing the desired video scene and action."),
  outputPath: z.string().describe("Path to save the generated video file."),
  referenceImagePaths: z
    .array(z.string())
    .min(1)
    .max(3)
    .describe(
      "List of local file paths to use as reference images (1-3 images). These guide the video content.",
    ),
  config: Veo31ConfigSchema.nullable()
    .optional()
    .describe(
      "Video generation configuration. Note: aspectRatio MUST be 16:9 for reference images.",
    ),
});

type ReferenceImagesToVideoParams = z.infer<
  typeof ReferenceImagesToVideoParamsSchema
>;

/**
 * VEO 3.1 Reference Images to Video tool.
 * Generate a video using reference images (assets) for strong visual consistency.
 */
export const veo31ReferenceImagesToVideoTool = tool({
  name: "veo31_reference_images_to_video",
  description: `Generate a video using reference images (assets) for strong visual consistency using VEO 3.1.
Use this for "ingredients to video" generation - the reference images guide the video's content.
CRITICAL: This tool ONLY works with 16:9 aspect ratio!
Best for: product demos, showcasing specific items, maintaining visual consistency.
NOTE: Provide local file paths - files will be uploaded automatically.`,
  parameters: ReferenceImagesToVideoParamsSchema,
  async execute(params: ReferenceImagesToVideoParams) {
    const { prompt, outputPath, referenceImagePaths, config } = params;

    // Force 16:9 aspect ratio for reference images
    const cfg = {
      resolution: config?.resolution ?? "720p",
      durationSeconds: config?.durationSeconds ?? "8",
      aspectRatio: "16:9" as const,
    };

    try {
      console.log(
        `[veo31_reference_images_to_video] Reference images: ${referenceImagePaths.length}`,
      );
      console.log(
        `[veo31_reference_images_to_video] Prompt: ${prompt.slice(0, 100)}...`,
      );

      const client = getKieAIClient();

      // Upload all reference images and get URLs
      const referenceImageUrls = await uploadFiles(client, referenceImagePaths);

      // Start video generation with reference images
      const generateResult = await client.veo31GenerateVideo({
        prompt,
        imageUrls: referenceImageUrls,
        generationType: "REFERENCE_2_VIDEO",
        aspectRatio: "16:9", // REQUIRED for reference images
        model: "veo3_fast",
        enableTranslation: true,
      });

      const taskId = generateResult.data?.taskId;
      if (!taskId) {
        return {
          status: "error",
          message: "Failed to start video generation - no task ID returned",
        };
      }

      console.log(`[veo31_reference_images_to_video] Task started: ${taskId}`);

      // Poll until complete
      const videoUrl = await client.veo31PollUntilComplete(taskId);

      // Download and save
      await downloadVideo(videoUrl, outputPath);

      return {
        status: "success",
        message: `Video generated and saved to ${outputPath}`,
        outputPath,
        videoUrl,
        taskId,
        config: cfg,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(`[veo31_reference_images_to_video] Error:`, errorMessage);
      return {
        status: "error",
        message: errorMessage,
        errorType: error instanceof KieAIError ? "KieAIError" : "UnknownError",
      };
    }
  },
});
