import { Replicate } from "@core/providers/replicate/models";
import { type ToolOutputImage, tool } from "@openai/agents";
import z from "zod";
import type { VideoGenAgentContext } from "../context";

const params = z.object({
  mode: z.enum(["max_quality", "ultra_fast"]),
  // unified params
  prompt: z.string().describe("text prompt"),
  // TODO: aspect ratio
  images: z
    .string()
    .array()
    .describe("optional image URLs to use as references"),
});

/**
 * WIP, not in use yet.
 */
export const unifiedImageGenTool = tool<VideoGenAgentContext>({
  name: "unified_image_gen",
  description: "image-generation tool, using muliple providers under the hood.",
  parameters: params,
  async execute(args) {
    const { prompt, images } = params.parse(args);

    const imgs = [];
    // 1. determine model to use
    switch (args.mode) {
      case "max_quality": {
        const imageUrl = await Replicate.NanoBanana.run({
          prompt,
          image_input: images,
          aspect_ratio: "9:16",
        });
        imgs.push(imageUrl);

        break;
      }

      case "ultra_fast": {
        const imageUrl = await Replicate.ZImageTurbo.run({
          prompt,
          // 9:16
          height: 1024,
          width: 576,
        });
        imgs.push(imageUrl);
      }
    }

    // return image outputs, consumed by agent
    const outImages: ToolOutputImage[] =
      imgs.map((url) => ({
        type: "image",
        image: url,
        detail: "low",
      })) ?? [];

    return outImages;
  },
});
