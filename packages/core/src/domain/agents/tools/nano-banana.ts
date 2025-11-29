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

import { Replicate } from "@core/providers/replicate/models";
import { tool } from "@openai/agents";
import { z } from "zod";

/**
 * Nano Banana image generation tool.
 * Generates images using Google's Nano Banana model via Replicate.
 */
export const nanoBananaTool = tool({
  name: "nano_banana",
  description: `Run the Nano Banana model for high-quality image generation. 
Can take input images for style reference, editing, or composition.
Auto-saves generated images and returns the URL.
For higher quality & details, set pro=true (default).
Supports various aspect ratios for different social media formats.`,
  parameters: z.object({
    prompt: z
      .string()
      .describe(
        "Ultra-detailed text prompt to guide image generation. Include subject, style, lighting, composition, camera angle, etc.",
      ),
    imageInputs: z
      .array(z.string())
      .nullable()
      .optional()
      .describe(
        "Optional list of image URLs to use as input/reference. Can be product images, style references, etc. Pass null if no input images.",
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
    pro: z
      .boolean()
      .default(true)
      .describe(
        "Use pro model for higher quality output. Set to false for faster, cheaper generation during iteration.",
      ),
    outputFormat: z
      .enum(["png", "jpg"])
      .default("jpg")
      .describe("Output image format."),
  }),
  async execute({ prompt, imageInputs, aspectRatio, pro, outputFormat }) {
    try {
      console.log(
        `[nanoBanana] Generating image with prompt: ${prompt.slice(0, 100)}...`,
      );
      console.log(`[nanoBanana] Input images: ${imageInputs?.length ?? 0}`);
      console.log(
        `[nanoBanana] Config: aspect=${aspectRatio}, pro=${pro}, format=${outputFormat}`,
      );

      // Convert null to undefined for the API
      const inputImages = imageInputs ?? undefined;

      const imageUrl = await Replicate.NanoBanana.run({
        prompt,
        image_input: inputImages,
        aspect_ratio: aspectRatio,
        pro,
        output_format: outputFormat,
      });

      console.log(`[nanoBanana] Generated image: ${imageUrl}`);

      return {
        success: true,
        imageUrl,
        prompt,
        config: {
          aspectRatio,
          pro,
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
