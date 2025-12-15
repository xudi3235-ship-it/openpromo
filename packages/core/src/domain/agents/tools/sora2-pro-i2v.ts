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
    .default("landscape")
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
 * Generate a video from an image using Sora 2 Pro.
 */
export const sora2ProI2VTool = tool<VideoGenAgentContext>({
  name: "sora2_pro_image_to_video",
  description: `Generate a video from an image using Sora 2 Pro.
The input image is used as the first frame to guide video generation.
Creates 10-15 second videos with high visual fidelity.

CRITICAL:
* Sora 2 Pro excels at creativity - prefer concise prompts that leave room for interpretation
NOTE: Provide local file paths or URLs - files will be uploaded automatically.`,
  parameters: params,
  async execute(args) {
    const parsed = params.parse(args);
    const {
      prompt,
      outputPath,
      inputImagePathOrUrl,
      aspectRatio,
      duration,
      quality,
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

    // Generate video using KieAI namespace
    const videoUrl = await KieAI.Sora2ProImageToVideo.run(
      {
        prompt,
        imageUrls: [imageUrl],
        aspectRatio,
        nFrames: duration,
        size: quality,
        removeWatermark,
      },
      {
        onPoll: (attempt, maxAttempts) => {
          VideoGenAgent.onProgressUpdate((draft) => {
            draft.logs.push(
              `[sora2_pro_i2v] Polling attempt ${attempt} of ${maxAttempts}`,
            );
          });
        },
      },
    );

    // Update progress with artifact
    VideoGenAgent.onProgressUpdate((draft) => {
      draft.artifacts.videos.push({ videoUrl, id: videoUrl });
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
