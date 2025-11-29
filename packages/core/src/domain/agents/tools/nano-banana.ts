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

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { Replicate } from "@core/providers/replicate/models";
import { tool } from "@openai/agents";
import { z } from "zod";

const OUTPUT_DIR = "./tmp/nanobana_output";

/**
 * Download image from URL and save to local path.
 */
async function downloadImage(url: string, outputPath: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  await writeFile(outputPath, Buffer.from(arrayBuffer));
  console.log(`[nanoBanana] Image saved to ${outputPath}`);
  return outputPath;
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
 * Nano Banana image generation tool.
 * Generates images using Google's Nano Banana model via Replicate.
 */
export const nanoBananaTool = tool({
  name: "nano_banana",
  description: `Run the Nano Banana model for high-quality text-to-image or image-to-image generation.
Can take up to 14 input images for style reference, editing, or composition.
Auto-saves generated images and returns the URL.`,
  parameters: NanoBananaParamsSchema,
  async execute(params: NanoBananaParams) {
    const { prompt, imageInputPaths, aspectRatio, outputFormat } = params;
    try {
      console.log(
        `[nanoBanana] Generating image with prompt: ${prompt.slice(0, 100)}...`,
      );
      console.log(`[nanoBanana] Input images: ${imageInputPaths?.length ?? 0}`);
      console.log(
        `[nanoBanana] Config: aspect=${aspectRatio}, format=${outputFormat}`,
      );

      // Convert null to undefined for the API
      const inputImages = imageInputPaths ?? undefined;

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

      return {
        success: true,
        imageUrl,
        outputPath,
        prompt,
        config: {
          aspectRatio,
          outputFormat,
          inputImageCount: inputImages?.length ?? 0,
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(`[nanoBanana] Error:`, errorMessage);
      return {
        success: false,
        error: errorMessage,
        prompt,
      };
    }
  },
});
