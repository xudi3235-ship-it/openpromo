/**
 * Sora 2 Pro Storyboard video generation tool.
 * Ported from Python: src/openai_agent/tools/sora2_storyboard/
 *
 * Generates multi-scene storyboard videos up to 25 seconds using Kie AI provider.
 */

import { KieAI } from "@core/providers/kie-ai";
import { downloadVideo as downloadVideoBase } from "@core/utils/common";
import { tool } from "@openai/agents";
import { z } from "zod";
import type { VideoGenAgentContext } from "../context";
import { VideoGenAgent } from "../video-gen-agent";
import { getKieAIClient, uploadFilesToKie } from "./utils";

/**
 * Download video from URL and save to local path.
 */
async function downloadVideo(url: string, outputPath: string): Promise<void> {
  await downloadVideoBase(url, outputPath, "sora2_storyboard");
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

const params = z.object({
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

/**
 * Sora 2 Pro Storyboard video generation tool.
 * Creates multi-scene videos up to 25 seconds by combining multiple shots.
 */
export const sora2StoryboardTool = tool<VideoGenAgentContext>({
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
  parameters: params,
  isEnabled(args) {
    const context = args.runContext.context as VideoGenAgentContext;
    return context.stage === "video_gen";
  },
  async execute(args) {
    const parsed = params.parse(args);
    const { shots, outputPath, duration, aspectRatio, referenceImagePaths } =
      parsed;

    // Validate total shot duration
    const totalShotDuration = shots.reduce(
      (sum, shot) => sum + shot.duration,
      0,
    );
    const expectedDuration = Number.parseFloat(duration);

    if (totalShotDuration > expectedDuration) {
      return {
        status: "error" as const,
        error: `Total shot durations (${totalShotDuration}s) exceed specified video duration (${expectedDuration}s)`,
      };
    }

    console.log(
      `[sora2_storyboard] Creating storyboard: ${shots.length} shots, ${duration}s duration`,
    );

    // Upload reference images if provided
    let imageUrls: string[] | undefined;
    if (referenceImagePaths && referenceImagePaths.length > 0) {
      const client = getKieAIClient();
      imageUrls = await uploadFilesToKie(client, referenceImagePaths);
    }

    // Convert shots to Kie AI format
    const kieShots = shots.map((shot) => ({
      scene: shot.scene,
      Scene: shot.scene, // Kie AI uses capitalized Scene
      duration: shot.duration,
    }));

    // Generate storyboard video using KieAI namespace
    const videoUrl = await KieAI.Sora2Storyboard.run(
      {
        shots: kieShots,
        nFrames: duration,
        aspectRatio,
        imageUrls,
      },
      {
        onPoll: (attempt: number, maxAttempts: number) => {
          const pct = Math.floor((attempt / maxAttempts) * 100);
          VideoGenAgent.updateVideoArtifact({
            id: videoUrl,
            videoUrl: "",
            state: "processing",
            progressPercent: pct,
          });
          VideoGenAgent.onProgressUpdate((draft) => {
            draft.logs.push(
              `[sora2_storyboard] Polling attempt ${attempt} of ${maxAttempts}`,
            );
          });
        },
      },
    );

    VideoGenAgent.updateVideoArtifact({
      id: videoUrl,
      videoUrl,
      state: "ready",
      progressPercent: 100,
    });

    // Download and save
    await downloadVideo(videoUrl, outputPath);

    return {
      status: "success" as const,
      videoUrl,
      outputPath,
    };
  },
});
