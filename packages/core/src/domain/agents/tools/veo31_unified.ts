/**
 * VEO 3.1 Unified tool using Replicate provider.
 * Image-to-video generation functionality.
 */

import { Replicate } from "@core/providers/replicate/models";
import { downloadVideo } from "@core/utils/common";
import { tool } from "@openai/agents";
import { getCurrentAgent } from "agents";
import { z } from "zod";
import type { VideoGenAgentContext } from "../context";
import type { VideoGenAgent } from "../video-gen-agent";

const params = z.object({
  outputPath: z.string().describe("Path to save the generated video file."),
  ...Replicate.Veo31Fast.schema.omit({
    seed: true,
    generate_audio: true,
    resolution: true, // default 720p
  }).shape,
});

export const veo31UnifiedTool = tool<VideoGenAgentContext>({
  name: "veo31_unified",
  description: `Generate a video from an image using VEO 3.1 Fast model via Replicate.
The input image is used as the first frame to guide generation.
Best for: animating static images, creating motion from still images.
NOTE: Provide image URLs - the tool will process them directly.`,
  parameters: params,
  isEnabled(args) {
    const context = args.runContext.context as VideoGenAgentContext;
    return context.stage === "video_gen";
  },
  async execute(args) {
    const parsed = params.parse(args);
    const { outputPath, ...rest } = parsed;

    console.log(
      `[veo31_unified] Config: ${JSON.stringify(rest)}, outputPath: ${outputPath}`,
    );

    try {
      // Run video generation using Replicate
      const prediction = await Replicate.Veo31Fast.run(rest);

      // Extract video URL from prediction
      const videoUrl = prediction.output as string;

      if (!videoUrl) {
        return {
          status: "error" as const,
          error: `Failed to generate video - no output URL returned, raw output: ${JSON.stringify(prediction)}`,
        };
      }

      console.log(`[veo31_unified] Video generated successfully: ${videoUrl}`);

      // Download and save the video
      await downloadVideo(videoUrl, outputPath);

      const { agent } = getCurrentAgent<VideoGenAgent>();
      agent?.patchState((draft) => {
        if (!draft.artifacts.videos) {
          draft.artifacts.videos = [];
        }
        draft.artifacts.videos.push({
          id: `$veo31_unified_${Date.now()}`,
          videoUrl: videoUrl,
        });
      });

      return {
        status: "success" as const,
        videoUrl,
        outputPath,
      };
    } catch (error) {
      console.error(`[veo31_unified] Error:`, error);
      return {
        status: "error" as const,
        error: `Failed to generate video: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});
