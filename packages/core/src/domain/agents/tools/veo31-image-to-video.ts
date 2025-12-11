/**
 * VEO 3.1 Image-to-Video tool.
 * Ported from Python: src/openai_agent/tools/veo31.py
 */

import { KieAI } from "@core/providers/kie-ai/models";
import { z } from "zod";
import type { VideoGenAgentContext } from "../context";
import { toolBuilder, toolSuccess } from "../tool-builder";
import { VideoGenAgent } from "../video-gen-agent";
import { downloadVideo, getKieAIClient, uploadFile } from "./utils";

// Parameter schema for image-to-video tool
const ImageToVideoParamsSchema = z.object({
  prompt: z.string().describe("Text prompt"),
  outputPath: z.string().describe("Path to save the generated video file."),
  inputImagePath: z
    .string()
    .describe("Local file path of the image to use as the start frame."),
  inputLastFramePath: z
    .string()
    .nullable()
    .optional()
    .describe(
      "Optional local file path of the last frame image for interpolation. Pass null if not using.",
    ),
  // config: Veo31ConfigSchema.nullable()
  //   .optional()
  //   .describe("Video generation configuration."),
});

type ImageToVideoParams = z.infer<typeof ImageToVideoParamsSchema>;

/**
 * VEO 3.1 Image-to-Video tool.
 * Generate a video from an image (first frame) using VEO 3.1.
 */
export const veo31ImageToVideoTool = toolBuilder<
  "veo31_image_to_video",
  typeof ImageToVideoParamsSchema,
  VideoGenAgentContext
>({
  name: "veo31_image_to_video",
  description: `Generate a video from an image using VEO 3.1.
The input image is used as the first frame to guide generation.
Optionally provide a last frame image for frame interpolation.
Best for: animating static images, starting from a specific visual, transitions.
NOTE: 

1. Provide local file paths - files will be uploaded automatically.
2. each video is fixed at 8s.

`,
  parameters: ImageToVideoParamsSchema,
  async execute(params: ImageToVideoParams) {
    const { prompt, outputPath, inputImagePath, inputLastFramePath } = params;

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

    // Start video generation via models API (handles polling)
    const videoUrl = await KieAI.Veo31.run(
      {
        prompt,
        imageUrls,
        generationType,
        aspectRatio: "9:16",
        model: "veo3_fast",
      },
      {
        onPoll: (attempt, maxAttempts) => {
          VideoGenAgent.onProgressUpdate((draft) => {
            draft.logs.push(`Progress: attempt ${attempt} of ${maxAttempts}`);
          });
        },
      },
    );

    // Download and save
    await downloadVideo(videoUrl, outputPath);

    return toolSuccess("veo31_image_to_video", {
      videoUrl,
      outputPath,
      prompt,
      inputImagePath,
      inputLastFramePath: inputLastFramePath ?? null,
    });
  },
});
