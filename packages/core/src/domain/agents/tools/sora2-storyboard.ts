/**
 * Sora 2 Pro Storyboard video generation tool.
 * Ported from Python: src/openai_agent/tools/sora2_storyboard/
 *
 * Generates multi-scene storyboard videos up to 25 seconds using Kie AI provider.
 */

import { basename } from "node:path";
import {
  type FrameDuration,
  KieAIClient,
  type StoryboardAspectRatio,
} from "@core/providers/kie-ai";
import { downloadVideo as downloadVideoBase } from "@core/utils/common";
import { env } from "@core/utils/env";
import { z } from "zod";
import type { VideoGenAgentContext } from "../context";
import { toolBuilder, toolError, toolSuccess } from "../tool-builder";
import { VideoGenAgent } from "../video-gen-agent";

/**
 * Get KieAI client instance.
 */
function getKieAIClient(): KieAIClient {
  return new KieAIClient({ apiKey: env.KIE_AI_API_KEY });
}

/**
 * Upload local files to KieAI and return their URLs.
 */
async function uploadFiles(
  client: KieAIClient,
  filePaths: string[],
): Promise<string[]> {
  const { readFile } = await import("node:fs/promises");
  const urls: string[] = [];

  for (const filePath of filePaths) {
    const fileBuffer = await readFile(filePath);
    const fileName = basename(filePath);

    console.log(`[sora2_storyboard] Uploading file: ${filePath}`);

    const response = await client.uploadFileStream({
      file: fileBuffer,
      uploadPath: "sora2_storyboard/images",
      fileName,
    });

    if (!response.data?.downloadUrl) {
      throw new Error(`Failed to upload file: ${filePath}`);
    }

    console.log(
      `[sora2_storyboard] Uploaded: ${filePath} -> ${response.data.downloadUrl}`,
    );
    urls.push(response.data.downloadUrl);
  }

  return urls;
}

/**
 * Download video from URL and save to local path.
 */
async function downloadVideo(url: string, outputPath: string): Promise<void> {
  await downloadVideoBase(url, outputPath, "sora2_storyboard");
}

/**
 * Map duration string to Kie AI FrameDuration type.
 */
function mapDuration(duration: "10" | "15" | "25"): FrameDuration {
  // FrameDuration is a union type of "10" | "15" | "25"
  return duration;
}

/**
 * Map aspect ratio string to Kie AI StoryboardAspectRatio type.
 */
function mapAspectRatio(
  aspectRatio: "portrait" | "landscape",
): StoryboardAspectRatio {
  // StoryboardAspectRatio is a union type of "portrait" | "landscape"
  return aspectRatio;
}

// Schema for a single storyboard shot
const StoryboardShotSchema = z.object({
  scene: z.string().describe("Scene description/prompt for this shot"),
  duration: z
    .number()
    .min(0)
    .default(7.5)
    .describe("Duration in seconds (typically 7.5s per scene)"),
});

// Parameter schema for sora2 storyboard tool
const Sora2StoryboardParamsSchema = z.object({
  shots: z
    .array(StoryboardShotSchema)
    .min(1)
    .describe(
      'List of scenes with prompts and durations. Example: [{"scene": "A cat eating cake", "duration": 7.5}]',
    ),
  outputPath: z
    .string()
    .describe("Path where the generated video will be saved"),
  duration: z
    .enum(["10", "15", "25"])
    .default("15")
    .describe("Total video length in seconds"),
  aspectRatio: z
    .enum(["portrait", "landscape"])
    .default("landscape")
    .describe("Video aspect ratio"),
  referenceImagePaths: z
    .array(z.string())
    .nullable()
    .optional()
    .describe("Optional start frame image paths for visual consistency"),
});

type Sora2StoryboardParams = z.infer<typeof Sora2StoryboardParamsSchema>;

/**
 * Sora 2 Pro Storyboard video generation tool.
 * Creates multi-scene videos up to 25 seconds by combining multiple shots.
 */
export const sora2StoryboardTool = toolBuilder<
  "sora2_storyboard_generate",
  typeof Sora2StoryboardParamsSchema,
  VideoGenAgentContext
>({
  name: "sora2_storyboard_generate",
  description: `Generate a multi-scene storyboard video using Sora 2 Pro.
Creates videos up to 25 seconds long by combining multiple scenes into a cohesive storyboard.
Each scene has its own prompt and duration. Shots don't have to be equal length, but total must not exceed duration param.

CRITICAL: 
* Sora2 excels at creativity, so it's preferred to not be extremely detailed prompt, but rather leave room for the model to interpret and create dynamic scenes, especially for social media style videos.
* sora2 image does NOT allow realistic person image as input, so avoid that in the img gen if you decide to use this.

Preferably use image gen tool to create image first, then use that along with the shots prompt to orchestrate the long video.

Best for: longer narrative videos, multi-scene storytelling, complex sequences.
NOTE: Provide local file paths for reference images - files will be uploaded automatically.`,
  parameters: Sora2StoryboardParamsSchema,
  isEnabled(args) {
    const context = args.runContext.context as VideoGenAgentContext;
    return context.stage === "video_gen";
  },
  async execute(params: Sora2StoryboardParams) {
    const { shots, outputPath, duration, aspectRatio, referenceImagePaths } =
      params;

    // Validate total shot duration
    const totalShotDuration = shots.reduce(
      (sum, shot) => sum + shot.duration,
      0,
    );
    const expectedDuration = Number.parseFloat(duration);

    if (totalShotDuration > expectedDuration) {
      return toolError(
        "sora2_storyboard_generate",
        `Total shot durations (${totalShotDuration}s) exceed specified video duration (${expectedDuration}s)`,
      );
    }

    console.log(
      `[sora2_storyboard] Creating storyboard: ${shots.length} shots, ${duration}s duration`,
    );

    const client = getKieAIClient();

    // Upload reference images if provided
    let imageUrls: string[] | undefined;
    if (referenceImagePaths && referenceImagePaths.length > 0) {
      imageUrls = await uploadFiles(client, referenceImagePaths);
    }

    // Convert shots to Kie AI format
    const kieShots = shots.map((shot) => ({
      scene: shot.scene,
      Scene: shot.scene, // Kie AI uses capitalized Scene
      duration: shot.duration,
    }));

    // Create storyboard task
    const response = await client.createStoryboardTask({
      shots: kieShots,
      nFrames: mapDuration(duration),
      aspectRatio: mapAspectRatio(aspectRatio),
      imageUrls,
    });

    const taskId = response.data?.taskId;
    if (!taskId) {
      return toolError(
        "sora2_storyboard_generate",
        "Failed to start storyboard generation - no task ID returned",
      );
    }
    console.log(`[sora2_storyboard] Task started: ${taskId}`);

    // Poll until complete using client's typed method
    const videoUrl = await client.pollTaskUntilComplete(taskId, {
      logPrefix: "sora2_storyboard",
      onPoll: async (attempt, maxAttempt) => {
        VideoGenAgent.onProgressUpdate((draft) => {
          draft.logs.push(
            `[sora2_storyboard] Polling attempt ${attempt} of ${maxAttempt}`,
          );
        });
      },
    });

    // Download and save
    await downloadVideo(videoUrl, outputPath);

    return toolSuccess("sora2_storyboard_generate", {
      videoUrl,
      outputPath,
      taskId,
    });
  },
});
