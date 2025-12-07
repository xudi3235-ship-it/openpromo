import { omitNull } from "@core/utils/common";
import { env } from "@core/utils/env";
import type { FileOutput, Prediction } from "replicate";
import { z } from "zod";
import { replicate } from "./client";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type ModelId = `${string}/${string}` | `${string}/${string}:${string}`;

type InnerPrediction = Prediction & {
  output: string;
};

function extractUrl(output: FileOutput): string {
  const url = output.url();
  if (!url) throw new Error("No URL returned from model output");
  return String(url);
}

function extractUrls(outputs: FileOutput[]): string[] {
  return outputs.map(extractUrl);
}
function wrapPrediction(prediction: Prediction): InnerPrediction {
  return {
    ...prediction,
    output: prediction.output as string,
  };
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

  export namespace SeedreamV4_5 {
    export const schema = z.object({
      prompt: z.string(),
      image_input: z.array(z.string()).default([]),
      aspect_ratio: z
        .enum([
          "match_input_image",
          "1:1",
          "4:3",
          "3:4",
          "16:9",
          "9:16",
          "3:2",
          "2:3",
          "21:9",
        ])
        .default("match_input_image"),
      size: z.enum(["2K", "4K", "custom"]).default("2K"),
      width: z.number().min(1024).max(4096).default(2048),
      height: z.number().min(1024).max(4096).default(2048),
      sequential_image_generation: z
        .enum(["disabled", "auto"])
        .default("disabled"),
      max_images: z.number().min(1).max(15).default(1),
    });
    export type Input = z.input<typeof schema>;

    export async function run(input: Input): Promise<string[]> {
      const parsed = schema.parse(input);
      const output = (await replicate.run("bytedance/seedream-4.5", {
        input: parsed,
      })) as FileOutput[];
      return extractUrls(output);
    }
  }

  export namespace NanoBanana {
    export const schema = z.object({
      prompt: z.string(),
      image_input: z
        .array(z.union([z.string(), z.instanceof(Buffer)]))
        .optional(),
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
        input: omitNull(parsed),
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
        input: omitNull({ ...parsed, openai_api_key: env.OPENAI_API_KEY }),
      })) as FileOutput[];
      return extractUrls(output);
    }
  }

  export namespace Flux2Pro {
    export const schema = z.object({
      prompt: z.string(),
      input_images: z.array(z.string()).default([]),
      aspect_ratio: z
        .enum([
          "match_input_image",
          "custom",
          "1:1",
          "16:9",
          "3:2",
          "2:3",
          "4:5",
          "5:4",
          "9:16",
          "3:4",
          "4:3",
        ])
        .default("1:1"),
      resolution: z
        .enum(["match_input_image", "0.5 MP", "1 MP", "2 MP", "4 MP"])
        .default("1 MP"),
      width: z.number().min(256).max(2048).optional().nullable(),
      height: z.number().min(256).max(2048).optional().nullable(),
      safety_tolerance: z.number().min(1).max(5).default(2),
      seed: z.number().optional(),
      output_format: z.enum(["webp", "jpg", "png"]).default("webp"),
      output_quality: z.number().min(0).max(100).default(80),
    });
    export type Input = z.input<typeof schema>;

    export async function run(input: Input): Promise<string> {
      const parsed = schema.parse(input);
      const output = (await replicate.run("black-forest-labs/flux-2-pro", {
        input: omitNull(parsed),
      })) as FileOutput;
      return extractUrl(output);
    }
  }

  export namespace ZImageTurbo {
    export const schema = z.object({
      prompt: z.string(),
      height: z.number().min(64).max(1440).default(1024),
      width: z.number().min(64).max(1440).default(1024),
      num_inference_steps: z.number().min(1).max(50).default(8),
      guidance_scale: z.number().min(0).max(20).default(0),
      seed: z.number().optional().nullable(),
      output_format: z.enum(["png", "jpg", "webp"]).default("jpg"),
      output_quality: z.number().min(0).max(100).default(80),
    });
    export type Input = z.input<typeof schema>;

    export async function run(input: Input): Promise<string> {
      const parsed = schema.parse(input);
      const output = (await replicate.run("prunaai/z-image-turbo", {
        input: omitNull(parsed),
      })) as FileOutput;
      return extractUrl(output);
    }
  }

  export namespace PImage {
    export const schema = z.object({
      prompt: z.string(),
      aspect_ratio: z
        .enum(["1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3", "custom"])
        .default("16:9"),
      width: z.number().min(256).max(1440).optional().nullable(),
      height: z.number().min(256).max(1440).optional().nullable(),
      prompt_upsampling: z.boolean().default(false),
      seed: z.number().optional().nullable(),
      disable_safety_checker: z.boolean().default(false),
    });
    export type Input = z.input<typeof schema>;

    export async function run(input: Input): Promise<string> {
      const parsed = schema.parse(input);
      const output = (await replicate.run("prunaai/p-image", {
        input: omitNull(parsed),
      })) as FileOutput;
      return extractUrl(output);
    }
  }

  export namespace PImageEdit {
    export const schema = z.object({
      prompt: z.string(),
      images: z.array(z.string()).default([]),
      turbo: z.boolean().default(true),
      aspect_ratio: z
        .enum([
          "match_input_image",
          "1:1",
          "16:9",
          "9:16",
          "4:3",
          "3:4",
          "3:2",
          "2:3",
        ])
        .default("match_input_image"),
      seed: z.number().optional().nullable(),
      disable_safety_checker: z.boolean().default(false),
    });
    export type Input = z.input<typeof schema>;

    export async function run(input: Input): Promise<string> {
      const parsed = schema.parse(input);
      const output = (await replicate.run("prunaai/p-image-edit", {
        input: omitNull(parsed),
      })) as FileOutput;
      return extractUrl(output);
    }
  }

  // -------------------------------------------------------------------------
  // Video Models (async via predictions API)
  // -------------------------------------------------------------------------

  export namespace KlingV25TurboPro {
    export const schema = z.object({
      prompt: z.string(),
      start_image: z.string().optional(),
      duration: z.union([z.literal(5), z.literal(10)]).default(10),
      aspect_ratio: z.enum(["16:9", "9:16", "1:1"]).default("16:9"),
      negative_prompt: z.string().optional(),
    });
    export type Input = z.input<typeof schema>;

    export async function run(input: Input): Promise<InnerPrediction> {
      const parsed = schema.parse(input);
      const prediction = await replicate.predictions.create({
        model: "kwaivgi/kling-v2.5-turbo-pro",
        input: omitNull(parsed),
      });
      const pred = await replicate.wait(prediction);
      return wrapPrediction(pred);
    }
  }

  export namespace Veo31Fast {
    export const schema = z.object({
      prompt: z.string(),
      image: z.string().describe("start frame image"),
      duration: z.union([z.literal(4), z.literal(6), z.literal(8)]).default(8),
      last_frame: z.string().optional().nullable(),
      negative_prompt: z.string().optional().nullable(),
      resolution: z.enum(["720p", "1080p"]).default("720p"),
      aspect_ratio: z.enum(["16:9", "9:16"]).default("9:16"),
      generate_audio: z.boolean().default(true),
      seed: z.number().optional().nullable(),
    });
    export type Input = z.input<typeof schema>;

    export async function run(input: Input): Promise<InnerPrediction> {
      const parsed = schema.parse(input);
      const prediction = await replicate.predictions.create({
        model: "google/veo-3.1-fast",
        input: omitNull(parsed), // remove nulls to use defaults
      });
      const pred = await replicate.wait(prediction);
      return wrapPrediction(pred);
    }
  }

  export namespace Ltx2Pro {
    export const schema = z.object({
      prompt: z.string(),
      image: z
        .string()
        .url()
        .optional()
        .describe("First frame image for optional image-to-video generation"),
      duration: z.union([z.literal(6), z.literal(8), z.literal(10)]).default(6),
      resolution: z.enum(["1080p", "2k", "4k"]).default("1080p"),
      generate_audio: z.boolean().default(true),
    });
    export type Input = z.input<typeof schema>;

    export async function run(input: Input): Promise<InnerPrediction> {
      const parsed = schema.parse(input);
      const prediction = await replicate.predictions.create({
        model: "lightricks/ltx-2-pro",
        input: omitNull(parsed),
      });
      const pred = await replicate.wait(prediction);
      return wrapPrediction(pred);
    }
  }

  export namespace Ltx2Fast {
    export const schema = z.object({
      prompt: z.string(),
      image: z
        .string()
        .url()
        .optional()
        .describe("First frame image for optional image-to-video generation"),
      duration: z
        .union([
          z.literal(6),
          z.literal(8),
          z.literal(10),
          z.literal(12),
          z.literal(14),
          z.literal(16),
          z.literal(18),
          z.literal(20),
        ])
        .default(6),
      resolution: z.enum(["1080p", "2k", "4k"]).default("1080p"),
      generate_audio: z.boolean().default(true),
    });
    export type Input = z.input<typeof schema>;

    export async function run(input: Input): Promise<InnerPrediction> {
      const parsed = schema.parse(input);
      const prediction = await replicate.predictions.create({
        model: "lightricks/ltx-2-fast",
        input: omitNull(parsed),
      });
      const pred = await replicate.wait(prediction);
      return wrapPrediction(pred);
    }
  }
}
