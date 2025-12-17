/**
 * Sora 2 Pro Image-to-Video tool.
 *
 * Generates videos from images using Sora 2 Pro model via Kie AI.
 */

import { KieAI } from "@core/providers/kie-ai";
import {
  downloadVideo as downloadVideoBase,
  isStringUrl,
} from "@core/utils/common";
import { tool } from "@openai/agents";
import { z } from "zod";
import type { VideoGenAgentContext } from "../context";
import { VideoGenAgent } from "../video-gen-agent";
import { getKieAIClient, uploadFile } from "./utils";

const params = z.object({
  prompt: z
    .string()
    .describe("Text prompt describing the desired video motion"),
  outputPath: z.string().describe("Path to save the generated video file"),
  inputImagePathOrUrl: z
    .string()
    .describe("Local file path or URL of the image to use as the first frame"),
  aspectRatio: z
    .enum(["portrait", "landscape"])
    .default("portrait")
    .describe("Video aspect ratio"),
  duration: z
    .enum(["10", "15"])
    .default("10")
    .describe("Video duration in seconds (10s or 15s)"),
  quality: z
    .enum(["standard", "high"])
    .default("standard")
    .describe("Video quality (standard or high)"),
  removeWatermark: z
    .boolean()
    .default(true)
    .describe("Whether to remove watermarks from the generated video"),
});

/**
 * Download video from URL and save to local path.
 */
async function downloadVideo(url: string, outputPath: string): Promise<void> {
  await downloadVideoBase(url, outputPath, "sora2_pro_i2v");
}

/**
 * Sora 2 Pro Image-to-Video tool.
 * Generate a video from an image using Sora 2 Pro and its family models
 */
export const sora2ProI2VTool = tool<VideoGenAgentContext>({
  name: "sora2_pro_image_to_video",
  description: `Generate a video from an image using Sora 2 Pro.
The input image is used as the first frame to guide video generation.
Creates 10-15 second videos with high visual fidelity.

Rules:
* Sora rejects image input with realistic person due to privacy concerns. To get around this, ensure the keyframe does not have a face, it can still have a person in there, just no face, then in the prompt, you can specify the movements so the person still shows up. This is to ensure the product exists and are accurate
* Provide local file paths or URLs - files will be uploaded automatically.
`,
  parameters: params,
  async execute(args) {
    const parsed = params.parse(args);
    const {
      prompt,
      outputPath,
      inputImagePathOrUrl,
      aspectRatio,
      duration,
      // quality, // TODO: re-enable when KieAI supports quality param
      removeWatermark,
    } = parsed;

    console.log(
      `[sora2_pro_i2v] Generating from image: ${inputImagePathOrUrl}`,
    );
    console.log(`[sora2_pro_i2v] Prompt: ${prompt.slice(0, 100)}...`);

    // Upload image if it's a local path
    let imageUrl: string;
    if (isStringUrl(inputImagePathOrUrl)) {
      imageUrl = inputImagePathOrUrl;
    } else {
      const client = getKieAIClient();
      imageUrl = await uploadFile(client, inputImagePathOrUrl);
    }

    let taskID: string | null = null;
    // Generate video using KieAI namespace
    const videoUrl = await KieAI.Sora2ImageToVideo.run(
      {
        prompt,
        imageUrls: [imageUrl],
        aspectRatio,
        nFrames: duration,
        // size: quality,
        removeWatermark,
      },
      {
        onTaskCreated: (taskId: string) => {
          VideoGenAgent.updateVideoArtifact({
            id: taskId,
          });
          taskID = taskId;
        },
        onPoll: (attempt: number, maxAttempts: number) => {
          VideoGenAgent.onProgressUpdate((draft) => {
            const pct = Math.floor((attempt / maxAttempts) * 100);
            const artifact = draft.artifacts.videos.find(
              (a) => a.id === taskID,
            );
            if (!artifact) return;
            draft.artifacts.videos.push({
              videoUrl: "",
              id: taskID as string,
              state: "processing",
              progressPercent: pct,
            });
            draft.logs.push(
              `[sora2_pro_i2v] Polling attempt ${attempt} of ${maxAttempts}`,
            );
          });
        },
      },
    );

    if (!taskID) {
      throw new Error("Task ID not set during Sora 2 Pro I2V generation");
    }

    // mark ready
    VideoGenAgent.updateVideoArtifact({
      id: taskID,
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
