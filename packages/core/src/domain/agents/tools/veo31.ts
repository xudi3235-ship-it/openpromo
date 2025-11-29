/**
 * VEO 3.1 video generation tools for video generation agent.
 * Ported from Python: src/openai_agent/tools/veo31.py
 *
 * Uses Kie AI provider for higher rate limits (as specified in agent prompt).
 *
 * NOTE: OpenAI Agents SDK requires `.nullable()` with `.optional()` for Zod schemas.
 * Using `.optional()` alone will cause: "Zod field uses .optional() without .nullable()
 * which is not supported by the API". Always use `.nullable().optional()` for optional fields.
 */

import { KieAIClient, KieAIError } from "@core/providers/kie-ai";
import { env } from "@core/utils/env";
import { tool } from "@openai/agents";
import { z } from "zod";

/**
 * Get KieAI client instance.
 */
function getKieAIClient(): KieAIClient {
  return new KieAIClient({ apiKey: env.KIE_AI_API_KEY });
}

/**
 * Download video from URL and save to local path.
 */
async function downloadVideo(url: string, outputPath: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download video: ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const { writeFile } = await import("node:fs/promises");
  await writeFile(outputPath, Buffer.from(arrayBuffer));
  console.log(`[veo31] Video saved to ${outputPath}`);
}

// Common config schema for veo31 tools
const Veo31ConfigSchema = z.object({
  resolution: z
    .enum(["720p", "1080p"])
    .default("720p")
    .describe(
      "Resolution of the generated video. 1080p only works with 8s duration.",
    ),
  durationSeconds: z
    .enum(["4", "6", "8"])
    .default("8")
    .describe("Duration of the generated video in seconds."),
  aspectRatio: z
    .enum(["9:16", "16:9"])
    .default("9:16")
    .describe("Aspect ratio. Use 9:16 for TikTok/Reels, 16:9 for YouTube."),
});

/**
 * VEO 3.1 Text-to-Video tool.
 * Generate a video from a text prompt.
 */
export const veo31TextToVideoTool = tool({
  name: "veo31_text_to_video",
  description: `Generate a video from a text prompt using VEO 3.1.
Creates up to 8 second videos from detailed text descriptions.
Best for: creative scenes, abstract concepts, text-driven generation.
Note: For product consistency, prefer veo31_reference_images_to_video instead.`,
  parameters: z.object({
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
  }),
  async execute({ prompt, outputPath, config }) {
    const cfg = config ?? {
      resolution: "720p",
      durationSeconds: "8",
      aspectRatio: "9:16",
    };

    try {
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
          message: "Failed to start video generation - no task ID returned",
        };
      }

      console.log(`[veo31_text_to_video] Task started: ${taskId}`);

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
      console.error(`[veo31_text_to_video] Error:`, errorMessage);
      return {
        status: "error",
        message: errorMessage,
        errorType: error instanceof KieAIError ? "KieAIError" : "UnknownError",
      };
    }
  },
});

/**
 * VEO 3.1 Image-to-Video tool.
 * Generate a video from an image (first frame) using VEO 3.1.
 */
export const veo31ImageToVideoTool = tool({
  name: "veo31_image_to_video",
  description: `Generate a video from an image using VEO 3.1.
The input image is used as the first frame to guide generation.
Optionally provide a last frame image for frame interpolation.
Best for: animating static images, starting from a specific visual, transitions.`,
  parameters: z.object({
    prompt: z
      .string()
      .describe("Text prompt describing the desired video motion/action."),
    outputPath: z.string().describe("Path to save the generated video file."),
    inputImageUrl: z
      .string()
      .describe("URL of the image to use as the first frame."),
    inputLastFrameUrl: z
      .string()
      .nullable()
      .optional()
      .describe(
        "Optional URL of the last frame image for interpolation. Pass null if not using.",
      ),
    config: Veo31ConfigSchema.nullable()
      .optional()
      .describe("Video generation configuration."),
  }),
  async execute({
    prompt,
    outputPath,
    inputImageUrl,
    inputLastFrameUrl,
    config,
  }) {
    const cfg = config ?? {
      resolution: "720p",
      durationSeconds: "8",
      aspectRatio: "9:16",
    };

    try {
      console.log(
        `[veo31_image_to_video] Generating from image: ${inputImageUrl}`,
      );
      console.log(`[veo31_image_to_video] Prompt: ${prompt.slice(0, 100)}...`);

      const client = getKieAIClient();

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

/**
 * VEO 3.1 Reference Images to Video tool.
 * Generate a video using reference images (assets) for strong visual consistency.
 */
export const veo31ReferenceImagesToVideoTool = tool({
  name: "veo31_reference_images_to_video",
  description: `Generate a video using reference images (assets) for strong visual consistency using VEO 3.1.
Use this for "ingredients to video" generation - the reference images guide the video's content.
CRITICAL: This tool ONLY works with 16:9 aspect ratio!
Best for: product demos, showcasing specific items, maintaining visual consistency.`,
  parameters: z.object({
    prompt: z
      .string()
      .describe("Text prompt describing the desired video scene and action."),
    outputPath: z.string().describe("Path to save the generated video file."),
    referenceImages: z
      .array(z.string())
      .min(1)
      .max(3)
      .describe(
        "List of image URLs to use as reference (1-3 images). These guide the video content.",
      ),
    config: Veo31ConfigSchema.nullable()
      .optional()
      .describe(
        "Video generation configuration. Note: aspectRatio MUST be 16:9 for reference images.",
      ),
  }),
  async execute({ prompt, outputPath, referenceImages, config }) {
    // Force 16:9 aspect ratio for reference images
    const cfg = {
      resolution: config?.resolution ?? "720p",
      durationSeconds: config?.durationSeconds ?? "8",
      aspectRatio: "16:9" as const,
    };

    try {
      console.log(
        `[veo31_reference_images_to_video] Reference images: ${referenceImages.length}`,
      );
      console.log(
        `[veo31_reference_images_to_video] Prompt: ${prompt.slice(0, 100)}...`,
      );

      const client = getKieAIClient();

      // Start video generation with reference images
      const generateResult = await client.veo31GenerateVideo({
        prompt,
        imageUrls: referenceImages,
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

/**
 * VEO 3.1 Video Extension tool.
 * Extend an existing VEO 3.1 video.
 */
export const veo31VideoExtensionTool = tool({
  name: "veo31_video_extension",
  description: `Extend an existing VEO 3.1 video by 7 seconds.
The input must be a previous VEO 3.1 generated video (via task ID).
Can extend up to 20 times, creating videos up to ~148 seconds.
Best for: making longer videos, continuing a scene, seamless extensions.`,
  parameters: z.object({
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
  }),
  async execute({ prompt, outputPath, inputVideoTaskId }) {
    try {
      console.log(
        `[veo31_video_extension] Extending video: ${inputVideoTaskId}`,
      );
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
          message: "Failed to start video extension - no task ID returned",
        };
      }

      console.log(`[veo31_video_extension] Extension task started: ${taskId}`);

      // Poll until complete
      const videoUrl = await client.veo31PollUntilComplete(taskId);

      // Download and save
      await downloadVideo(videoUrl, outputPath);

      return {
        status: "success",
        message: `Video extended and saved to ${outputPath}`,
        outputPath,
        videoUrl,
        taskId,
        originalTaskId: inputVideoTaskId,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(`[veo31_video_extension] Error:`, errorMessage);
      return {
        status: "error",
        message: errorMessage,
        errorType: error instanceof KieAIError ? "KieAIError" : "UnknownError",
      };
    }
  },
});
