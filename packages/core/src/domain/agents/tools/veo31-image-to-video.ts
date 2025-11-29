/**
 * VEO 3.1 Image-to-Video tool.
 * Ported from Python: src/openai_agent/tools/veo31.py
 */

import { KieAIError } from "@core/providers/kie-ai";
import { tool } from "@openai/agents";
import { z } from "zod";
import {
  defaultVeo31Config,
  downloadVideo,
  getKieAIClient,
  uploadFile,
  Veo31ConfigSchema,
} from "./veo31-utils";

// Parameter schema for image-to-video tool
const ImageToVideoParamsSchema = z.object({
  prompt: z
    .string()
    .describe("Text prompt describing the desired video motion/action."),
  outputPath: z.string().describe("Path to save the generated video file."),
  inputImagePath: z
    .string()
    .describe("Local file path of the image to use as the first frame."),
  inputLastFramePath: z
    .string()
    .nullable()
    .optional()
    .describe(
      "Optional local file path of the last frame image for interpolation. Pass null if not using.",
    ),
  config: Veo31ConfigSchema.nullable()
    .optional()
    .describe("Video generation configuration."),
});

type ImageToVideoParams = z.infer<typeof ImageToVideoParamsSchema>;

/**
 * VEO 3.1 Image-to-Video tool.
 * Generate a video from an image (first frame) using VEO 3.1.
 */
export const veo31ImageToVideoTool = tool({
  name: "veo31_image_to_video",
  description: `Generate a video from an image using VEO 3.1.
The input image is used as the first frame to guide generation.
Optionally provide a last frame image for frame interpolation.
Best for: animating static images, starting from a specific visual, transitions.
NOTE: Provide local file paths - files will be uploaded automatically.`,
  parameters: ImageToVideoParamsSchema,
  async execute(params: ImageToVideoParams) {
    const { prompt, outputPath, inputImagePath, inputLastFramePath, config } =
      params;
    const cfg = config ?? defaultVeo31Config;

    try {
      console.log(
        `[veo31_image_to_video] Generating from image: ${inputImagePath}`,
      );
      console.log(`[veo31_image_to_video] Prompt: ${prompt.slice(0, 100)}...`);

      const client = getKieAIClient();

      // Upload images and get URLs
      const inputImageUrl = await uploadFile(client, inputImagePath);
      const inputLastFrameUrl = inputLastFramePath
        ? await uploadFile(client, inputLastFramePath)
        : undefined;

      // Build image URLs array (first frame, optionally last frame)
      const imageUrls = inputLastFrameUrl
        ? [inputImageUrl, inputLastFrameUrl]
        : [inputImageUrl];

      // Determine generation type
      const generationType = inputLastFrameUrl
        ? ("FIRST_AND_LAST_FRAMES_2_VIDEO" as const)
        : undefined;

      // Start video generation
      const generateResult = await client.veo31GenerateVideo({
        prompt,
        imageUrls,
        generationType,
        aspectRatio: cfg.aspectRatio === "16:9" ? "16:9" : "9:16",
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

      console.log(`[veo31_image_to_video] Task started: ${taskId}`);

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
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(`[veo31_image_to_video] Error:`, errorMessage);
      return {
        status: "error",
        message: errorMessage,
        errorType: error instanceof KieAIError ? "KieAIError" : "UnknownError",
      };
    }
  },
});
