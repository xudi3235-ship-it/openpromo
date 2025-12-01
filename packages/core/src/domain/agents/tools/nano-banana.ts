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
import { z } from "zod";
import type { VideoGenAgentContext } from "../context";
import { toolBuilder, toolSuccess } from "../tool-builder";

const OUTPUT_DIR = "/tmp/nanobana_output";

/**
 * Download image from URL and save to local path.
 */
async function downloadImage(url: string, outputPath: string): Promise<string> {
  return downloadImageBase(url, outputPath, "nanoBanana");
}

// Define schema separately for better type inference
const NanoBananaParamsSchema = z.object({
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
  outputFormat: z
    .enum(["png", "jpg"])
    .default("jpg")
    .describe("Output image format."),
});

type NanoBananaParams = z.infer<typeof NanoBananaParamsSchema>;

/**
 * handles transforming file inputs for replicate api calls
 * @param inputs
 * @returns
 */
function transformFileInputs(inputs: string[]): (string | Buffer)[] {
  return inputs.map((input) => {
    // 1. if url string, use as is
    if (isStringUrl(input)) return input;
    // 2. else if local path, read and pass in blob/File/buffer
    // replicate client will upload it
    return readFileSync(input);
  });
}

/**
 * Nano Banana image generation tool.
 * Generates images using Google's Nano Banana model via Replicate.
 */
export const nanoBananaTool = toolBuilder<
  "nano_banana",
  typeof NanoBananaParamsSchema,
  VideoGenAgentContext
>({
  name: "nano_banana",
  description: `Run the Nano Banana model for high-quality text-to-image or image-to-image generation.
Can take up to 14 input images for style reference, editing, or composition.
Auto-saves generated images and returns the URL.`,
  parameters: NanoBananaParamsSchema,
  async execute(params: NanoBananaParams) {
    console.log(
      `[nanoBanana] Tool invoked with params:`,
      JSON.stringify(params),
    );
    const { prompt, imageInputPaths, aspectRatio, outputFormat } = params;
    const inputImages = transformFileInputs(imageInputPaths ?? []);

    const imageUrl = await Replicate.NanoBanana.run({
      prompt,
      image_input: inputImages,
      aspect_ratio: aspectRatio,
      output_format: outputFormat,
    });

    console.log(`[nanoBanana] Generated image URL: ${imageUrl}`);

    // Ensure output directory exists
    await mkdir(OUTPUT_DIR, { recursive: true });

    // Generate unique filename with timestamp
    const timestamp = Date.now();
    const fileName = `nanobana_${timestamp}.${outputFormat}`;
    const outputPath = join(OUTPUT_DIR, fileName);

    // Download and save the image
    await downloadImage(imageUrl, outputPath);

    return toolSuccess("nano_banana", {
      imageUrl,
      outputPath,
    });
  },
});
