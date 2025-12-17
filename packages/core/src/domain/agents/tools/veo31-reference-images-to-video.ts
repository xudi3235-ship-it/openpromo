/**
 * VEO 3.1 Reference Images to Video tool.
 * Ported from Python: src/openai_agent/tools/veo31.py
 */

import { KieAI } from "@core/providers/kie-ai/models";
import { tool } from "@openai/agents";
import { z } from "zod";
import type { VideoGenAgentContext } from "../context";
import { VideoGenAgent } from "../video-gen-agent";
import {
  defaultVeo31Config,
  downloadVideo,
  getKieAIClient,
  uploadFiles,
  Veo31ConfigSchema,
} from "./utils";

const params = z.object({
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

/**
 * VEO 3.1 Reference Images to Video tool.
 * Generate a video using reference images (assets) for strong visual consistency.
 */
export const veo31ReferenceImagesToVideoTool = tool<VideoGenAgentContext>({
  name: "veo31_reference_images_to_video",
  description: `Generate a video using reference images (assets) for strong visual consistency using VEO 3.1.
Use this for "ingredients to video" generation - the reference images guide the video's content.
CRITICAL: This tool ONLY works with 16:9 aspect ratio!
Best for: product demos, showcasing specific items, maintaining visual consistency.
NOTE: Provide local file paths - files will be uploaded automatically.`,
  parameters: params,
  async execute(args) {
    const parsed = params.parse(args);
    const { prompt, outputPath, referenceImagePaths, config } = parsed;

    // Force 16:9 aspect ratio for reference images
    const cfg = {
      ...(config ?? defaultVeo31Config),
      aspectRatio: "16:9" as const,
    };
    console.log(
      `[veo31_reference_images_to_video] Using forced aspect ratio: ${cfg.aspectRatio}`,
    );

    console.log(
      `[veo31_reference_images_to_video] Reference images: ${referenceImagePaths.length}`,
    );
    console.log(
      `[veo31_reference_images_to_video] Prompt: ${prompt.slice(0, 100)}...`,
    );

    const client = getKieAIClient();

    // Upload all reference images and get URLs
    const referenceImageUrls = await uploadFiles(client, referenceImagePaths);

    // Generate video via models API (handles task creation + polling)
    const videoUrl = await KieAI.Veo31.run(
      {
        prompt,
        aspectRatio: cfg.aspectRatio,
        model: "veo3_fast",
        imageUrls: referenceImageUrls,
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
        },
        onTaskCreated(taskId) {
          VideoGenAgent.updateVideoArtifact({
            id: taskId,
            videoUrl: "",
            state: "processing",
            progressPercent: null,
          });
          VideoGenAgent.onProgressUpdate((draft) => {
            draft.logs.push(`Task created with ID: ${taskId}`);
          });
        },
      },
    );

    // mark ready and download
    VideoGenAgent.onProgressUpdate((draft) => {
      const artifact = draft.artifacts.videos.find(
        (a) => a.videoUrl === videoUrl,
      );
      if (artifact) {
        artifact.state = "ready";
        artifact.progressPercent = 100;
      } else {
        draft.artifacts.videos.push({
          videoUrl,
          id: videoUrl,
          state: "ready",
          progressPercent: 100,
        });
      }
    });
    VideoGenAgent.updateVideoArtifact({
      id: videoUrl,
      videoUrl,
      state: "ready",
      progressPercent: 100,
    });

    await downloadVideo(videoUrl, outputPath);

    return {
      status: "success" as const,
      videoUrl,
      outputPath,
      prompt,
      referenceImagePaths,
    };
  },
});
