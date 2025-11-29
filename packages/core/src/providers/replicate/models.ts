import { env } from "@core/utils/env";
import type { FileOutput, Prediction } from "replicate";
import { z } from "zod";
import { replicate } from "./client";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type ModelId = `${string}/${string}` | `${string}/${string}:${string}`;

function extractUrl(output: FileOutput): string {
  const url = output.url();
  if (!url) throw new Error("No URL returned from model output");
  return String(url);
}

function extractUrls(outputs: FileOutput[]): string[] {
  return outputs.map(extractUrl);
}

// ---------------------------------------------------------------------------
// Replicate Models
// ---------------------------------------------------------------------------

export namespace Replicate {
  // -------------------------------------------------------------------------
  // Image Models
  // -------------------------------------------------------------------------

  export namespace IdeogramV3Turbo {
    export const schema = z.object({
      prompt: z.string(),
      imageRefs: z.array(z.string()).optional(),
      aspect_ratio: z
        .enum(["1:1", "2:3", "3:2", "3:4", "4:3", "9:16", "16:9"])
        .default("1:1"),
    });
    export type Input = z.input<typeof schema>;

    export async function run(input: Input): Promise<string> {
      const parsed = schema.parse(input);
      const output = (await replicate.run("ideogram-ai/ideogram-v3-turbo", {
        input: parsed,
      })) as FileOutput;
      return extractUrl(output);
    }
  }

  export namespace SeedreamV4 {
    export const schema = z.object({
      prompt: z.string(),
      image_input: z.array(z.string()).optional(),
      aspect_ratio: z
        .enum(["1:1", "2:3", "3:2", "3:4", "4:3", "9:16", "16:9"])
        .default("3:4"),
      size: z.enum(["1K", "2K", "4K", "custom"]).default("2K"),
      max_images: z.number().min(1).max(15).default(1),
      enhance_prompt: z.boolean().default(false),
    });
    export type Input = z.input<typeof schema>;

    export async function run(input: Input): Promise<string> {
      const parsed = schema.parse(input);
      const output = (await replicate.run("bytedance/seedream-4", {
        input: parsed,
      })) as FileOutput[];
      return extractUrl(output[0]);
    }
  }

  export namespace NanoBanana {
    export const schema = z.object({
      prompt: z.string(),
      image_input: z.array(z.string()).optional(),
      aspect_ratio: z
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
        .default("match_input_image"),
      output_format: z.enum(["png", "jpg"]).default("jpg"),
      pro: z.boolean().default(true),
    });
    export type Input = z.input<typeof schema>;

    export async function run(input: Input): Promise<string> {
      const { pro, ...parsed } = schema.parse(input);
      const model = pro ? "google/nano-banana-pro" : "google/nano-banana";
      const output = (await replicate.run(model as ModelId, {
        input: parsed,
      })) as FileOutput;
      return extractUrl(output);
    }
  }

  export namespace GptImage1 {
    export const schema = z.object({
      prompt: z.string(),
      input_images: z.array(z.string()).optional(),
      output_format: z.enum(["webp", "png"]).default("webp"),
      number_of_images: z.number().min(1).max(10).default(1),
      output_compression: z.number().min(0).max(100).optional(),
      background: z.enum(["auto", "opaque", "transparent"]).default("auto"),
      quality: z.enum(["auto", "low", "medium", "high"]).default("auto"),
      input_fidelity: z.enum(["low", "high"]).default("high"),
      aspect_ratio: z.enum(["1:1", "3:2", "2:3"]).default("1:1"),
    });
    export type Input = z.input<typeof schema>;

    export async function run(input: Input): Promise<string[]> {
      const parsed = schema.parse(input);
      const output = (await replicate.run("openai/gpt-image-1", {
        input: { ...parsed, openai_api_key: env.OPENAI_API_KEY },
      })) as FileOutput[];
      return extractUrls(output);
    }
  }

  // -------------------------------------------------------------------------
  // Video Models (async via predictions API)
  // -------------------------------------------------------------------------

  export namespace KlingV25TurboPro {
    export const schema = z.object({
      prompt: z.string(),
      start_image: z.string().optional(),
      duration: z.enum(["5", "10"]).default("10").transform(Number),
      aspect_ratio: z.enum(["16:9", "9:16", "1:1"]).default("16:9"),
      negative_prompt: z.string().optional(),
    });
    export type Input = z.input<typeof schema>;

    export async function run(input: Input): Promise<Prediction> {
      const parsed = schema.parse(input);
      const prediction = await replicate.predictions.create({
        model: "kwaivgi/kling-v2.5-turbo-pro",
        input: parsed,
      });
      return replicate.wait(prediction);
    }
  }

  export namespace Veo31Fast {
    export const schema = z.object({
      prompt: z.string(),
      image: z.string().optional(),
      duration: z.enum(["4", "6", "8"]).default("8").transform(Number),
      start_frame: z.string().optional(),
      last_frame: z.string().optional(),
      negative_prompt: z.string().optional(),
      resolution: z.enum(["720p", "1080p"]).default("1080p"),
      aspect_ratio: z.enum(["16:9", "9:16", "1:1"]).default("16:9"),
      generate_audio: z.boolean().default(true),
      seed: z.number().optional(),
    });
    export type Input = z.input<typeof schema>;

    export async function run(input: Input): Promise<Prediction> {
      const parsed = schema.parse(input);
      const prediction = await replicate.predictions.create({
        model: "google/veo-3.1-fast",
        input: parsed,
      });
      return replicate.wait(prediction);
    }
  }
}
