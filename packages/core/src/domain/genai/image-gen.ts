import { replicate } from "@core/providers/replicate";
import { env } from "@core/utils/env";
import z from "zod";

// -----------------------------------------------------------
// Zod Schemas for Image Model Inputs
// -----------------------------------------------------------

const IdeogramV3TurboInput = z.object({
  prompt: z.string(),
  imageRefs: z.array(z.string()).optional(),
  aspect_ratio: z.string().default("1:1"),
});

const SeedreamV4Input = z.object({
  prompt: z.string(),
  image_input: z.array(z.string()).optional(),
  aspect_ratio: z.string().default("3:4"),
  size: z.enum(["1K", "2K", "4K", "custom"]).default("2K"),
  max_images: z.number().min(1).max(15).default(1),
  enhance_prompt: z.boolean().default(false),
});

const NanoBananaInput = z
  .object({
    prompt: z.string(),
    image_input: z.array(z.string()).optional(),
    aspect_ratio: z
      .enum([
        "1:1",
        "2:3",
        "3:2",
        "3:4",
        "4:3",
        "16:9",
        "9:16",
        "match_input_image",
      ])
      .default("match_input_image"),
    output_format: z.enum(["png", "jpg"]).default("jpg"),
  })
  .describe("Input schema for Nano Banana model");

const GptImage1Input = z
  .object({
    prompt: z.string(),
    input_images: z.array(z.string()).optional(),
    output_format: z.enum(["webp", "png"]).default("webp"),
    number_of_images: z.number().min(1).max(10).default(1),
    output_compression: z.number().min(0).max(100).optional(),
    background: z.enum(["auto", "opaque", "transparent"]).default("auto"),
    quality: z.enum(["auto", "low", "medium", "high"]).default("auto"),
    input_fidelity: z.enum(["low", "high"]).default("high"),
    aspect_ratio: z.enum(["1:1", "3:2", "2:3"]).default("1:1"),
  })
  .describe("Input schema for GPT-Image-1 model");

// -----------------------------------------------------------
// unified img output schema
// -----------------------------------------------------------
const ImageModelOutput = z.object({
  images: z
    .object({
      url: z.string(),
      buffer: z.instanceof(Uint8Array).optional(),
    })
    .array()
    .min(1),
});

export namespace ImageGen {
  // -----------------------------------------------------------
  // contract
  export type IdeogramV3TurboInput = z.infer<typeof IdeogramV3TurboInput>;
  export type SeedreamV4Input = z.infer<typeof SeedreamV4Input>;
  export type NanoBananaInput = z.infer<typeof NanoBananaInput>;
  export type GptImage1Input = z.infer<typeof GptImage1Input>;

  export type ImageModelOutput = z.infer<typeof ImageModelOutput>;

  export type ModelType =
    | "ideogram-v3-turbo"
    | "seedream-v4"
    | "nano-banana"
    | "gpt-image-1";

  // -----------------------------------------------------------
  // model handlers
  // -----------------------------------------------------------
  async function runIdeogramV3Turbo(
    input: IdeogramV3TurboInput,
  ): Promise<ImageModelOutput> {
    const validated = IdeogramV3TurboInput.parse(input);
    const replicateInput = {
      ...validated,
    };
    console.log("generating image with ideogram-v3-turbo", replicateInput);

    const output = await replicate.run("ideogram-ai/ideogram-v3-turbo", {
      input: replicateInput,
    });

    // @ts-expect-error - replicate types
    const imageUrl = output.url();
    if (!imageUrl)
      throw new Error("No image URL returned from Ideogram V3 Turbo");

    return {
      images: [{ url: String(imageUrl) }],
    };
  }

  async function runSeedreamV4(
    input: SeedreamV4Input,
  ): Promise<ImageModelOutput> {
    const validated = SeedreamV4Input.parse(input);
    const replicateInput = {
      ...validated,
    };
    console.log("generating image with seedream-v4", replicateInput);

    const output = await replicate.run("bytedance/seedream-4", {
      input: replicateInput,
    });

    // @ts-expect-error - replicate types
    const imageUrl = output[0]?.url();
    if (!imageUrl) throw new Error("No image URL returned from Seedream V4");

    return {
      images: [{ url: String(imageUrl) }],
    };
  }

  async function runNanoBanana(
    input: NanoBananaInput,
  ): Promise<ImageModelOutput> {
    const validated = NanoBananaInput.parse(input);
    const replicateInput = {
      ...validated,
    };
    console.log("generating image with nano-banana", replicateInput);

    const output = await replicate.run("google/nano-banana", {
      input: replicateInput,
    });

    // @ts-expect-error - replicate types
    const imageUrl = output.url();
    if (!imageUrl) throw new Error("No image URL returned from NanoBanana");

    return {
      images: [{ url: String(imageUrl) }],
    };
  }

  async function runGptImage1(
    input: GptImage1Input,
  ): Promise<ImageModelOutput> {
    const validated = GptImage1Input.parse(input);
    const replicateInput = {
      ...validated,
      openai_api_key: env.OPENAI_API_KEY,
    };
    console.log("generating image with gpt-image-1", replicateInput);

    const output = await replicate.run("openai/gpt-image-1", {
      input: replicateInput,
    });

    const images = Array.isArray(output) ? output : [output];
    const imageUrls = images
      .map((img: unknown) => {
        if (
          img &&
          typeof img === "object" &&
          "url" in img &&
          typeof img.url === "function"
        ) {
          return img.url();
        }
        return null;
      })
      .filter(Boolean)
      .map(String);

    if (imageUrls.length === 0) {
      throw new Error("No image URLs returned from GPT-Image-1");
    }

    return {
      images: imageUrls.map((url) => ({ url })),
    };
  }

  // -----------------------------------------------------------
  // model registry
  // -----------------------------------------------------------
  const modelHandlers = {
    "ideogram-v3-turbo": runIdeogramV3Turbo,
    "seedream-v4": runSeedreamV4,
    "nano-banana": runNanoBanana,
    "gpt-image-1": runGptImage1,
  } as const;

  type ModelInputMap = {
    "ideogram-v3-turbo": IdeogramV3TurboInput;
    "seedream-v4": SeedreamV4Input;
    "nano-banana": NanoBananaInput;
    "gpt-image-1": GptImage1Input;
  };

  // -----------------------------------------------------------
  // single unified function to call different image models
  // -----------------------------------------------------------
  export async function run<T extends ModelType>(
    model: T,
    input: ModelInputMap[T],
  ): Promise<ImageModelOutput> {
    const handler = modelHandlers[model];
    if (!handler) {
      throw new Error(`Unknown model: ${model}`);
    }
    // @ts-expect-error - handler types are correctly matched by overloads
    return handler(input);
  }
}
