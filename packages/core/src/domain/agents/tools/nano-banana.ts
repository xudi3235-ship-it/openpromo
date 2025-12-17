/**
 * Nano Banana image generation tool for video generation agent.
 * Ported from Python: src/openai_agent/tools/nano_banana.py
 *
 * Uses Replicate's nano-banana model via our existing provider.
 *
 * NOTE: OpenAI Agents SDK requires `.nullable()` with `.optional()` for Zod schemas.
 * Using `.optional()` alone will cause: "Zod field uses .optional() without .nullable()
 * which is not supported by the API". Always use `.nullable().optional()` for optional fields.
 * See: https://platform.openai.com/docs/guides/structured-outputs?api-mode=responses#all-fields-must-be-required
 */

import { readFileSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { Replicate } from "@core/providers/replicate/models";
import {
  downloadImage as downloadImageBase,
  isStringUrl,
} from "@core/utils/common";
import { Log } from "@core/utils/log";
import {
  type ToolOutputImage,
  type ToolOutputText,
  tool,
} from "@openai/agents";
// no need to grab current agent; use VideoGenAgent helper
import { z } from "zod";
import type { VideoGenAgentContext } from "../context";
import { VideoGenAgent } from "../video-gen-agent";
import { getKieAIClient, uploadFilesToKie } from "./utils";

const OUTPUT_DIR = "/tmp/nanobana_output";

const log = Log.create({ namespace: "nano-banana-tool" });

/**
 * Download image from URL and save to local path.
 */
async function downloadImage(url: string, outputPath: string): Promise<string> {
  return downloadImageBase(url, outputPath, "nanoBanana");
}

const params = z.object({
  prompt: z
    .string()
    .describe(
      "Ultra-detailed text prompt to guide image generation. Include subject, style, lighting, composition, camera angle, etc.",
    ),
  imageInputPaths: z
    .array(z.string())
    .nullable()
    .optional()
    .describe(
      "Optional list of image file paths to use as input/reference. Can be product images, style references, etc. Pass null if no input images.",
    ),
  aspectRatio: z
    .enum([
      "1:1",
      "2:3",
      "3:2",
      "3:4",
      "4:3",
      "9:16",
      "16:9",
      "match_input_image",
    ])
    .default("match_input_image")
    .describe(
      "Aspect ratio of the generated image. Use 9:16 for TikTok/Reels, 1:1 for Instagram posts, 16:9 for YouTube.",
    ),
});

type NanoBananaParams = z.infer<typeof params>;

/**
 * handles transforming file inputs for replicate api calls
 */
export function transformFileInputs(inputs: string[]): (string | Buffer)[] {
  return inputs.map((input) => {
    // 1. if url string, use as is
    if (isStringUrl(input)) return input;
    // 2. else if local path, read and pass in blob/File/buffer
    // replicate client will upload it
    return readFileSync(input);
  });
}

async function providerRepImpl(params: NanoBananaParams) {
  const { prompt, imageInputPaths, aspectRatio } = params;
  const inputImages = transformFileInputs(imageInputPaths ?? []);

  const imageUrl = await Replicate.NanoBanana.run({
    prompt,
    image_input: inputImages,
    aspect_ratio: aspectRatio,
    output_format: "jpg",
    pro: false, // cheaper for test
  });

  return imageUrl;
}

async function providerKieImpl(params: NanoBananaParams) {
  const { prompt, imageInputPaths, aspectRatio } = params;
  const client = getKieAIClient();
  const imageUrls = await uploadFilesToKie(client, imageInputPaths ?? []);
  const task = await client.createGenericTask("nano-banana-pro", {
    prompt,
    imageInput: imageUrls,
    aspectRatio,
  });
  const taskID = task.data?.taskId;
  if (!taskID)
    throw new Error("Failed to start Nano Banana task - no task ID returned");
  const imageUrl = await client.pollTaskUntilComplete(taskID, {
    onPoll(attempt: number, maxAttempt: number) {
      const pct = Math.floor((attempt / maxAttempt) * 100);
      VideoGenAgent.updateImageArtifact({
        id: taskID,
        state: "processing",
        progressPercent: pct,
      });
    },
  });
  return imageUrl;
}

async function impl(provider: "replicate" | "kie", params: NanoBananaParams) {
  switch (provider) {
    case "replicate":
      return await providerRepImpl(params);
    case "kie":
      return await providerKieImpl(params);
  }
}

/**
 * Nano Banana image generation tool.
 * Generates images using Google's Nano Banana model via Replicate.
 */
export const nanoBananaTool = tool<VideoGenAgentContext>({
  name: "nano_banana",
  description: `Run the Nano Banana model for high-quality text-to-image or image-to-image generation.
Can take up to 14 input images for style reference, editing, or composition.
Auto-saves generated images and returns the URL.`,
  parameters: params,
  async execute(args) {
    const parsed = params.parse(args);
    console.log(
      `[nanoBanana] Tool invoked with params:`,
      JSON.stringify(parsed),
    );

    const imageUrl = await impl("kie", parsed);
    console.log(`[nanoBanana] Generated image URL: ${imageUrl}`);

    // Ensure output directory exists
    await mkdir(OUTPUT_DIR, { recursive: true });

    // Generate unique filename with timestamp
    const timestamp = Date.now();
    const fileName = `nanobana_${timestamp}.jpg`;
    const outputPath = join(OUTPUT_DIR, fileName);

    // Download and save the image
    await downloadImage(imageUrl, outputPath);

    // update agent state with artifacts via helper
    VideoGenAgent.updateImageArtifact({
      id: `nano_banana_${Date.now()}`,
      imageUrl,
      state: "ready",
      progressPercent: 100,
    });

    const textPart: ToolOutputText = {
      type: "text",
      text: `success. Generated image saved at ${outputPath}, URL: ${imageUrl}`,
    };
    const imagePart: ToolOutputImage = {
      type: "image",
      image: imageUrl,
      detail: "high",
    };
    log.info("nanoBanana tool execution completed", { outputPath, imageUrl });

    return [textPart, imagePart];
  },
});
