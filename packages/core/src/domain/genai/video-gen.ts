import { replicate } from "@core/providers/replicate";
import z from "zod";

// -----------------------------------------------------------
// Zod Schemas for Video Model Inputs
// -----------------------------------------------------------

const KlingV25TurboProInput = z.object({
  prompt: z.string(),
  start_image: z.string().optional(),
  duration: z.enum(["5", "10"]).default("10").transform(Number),
  aspect_ratio: z.enum(["16:9", "9:16", "1:1"]).default("16:9"),
  negative_prompt: z.string().optional(),
});

const Veo31FastInput = z.object({
  prompt: z.string(),
  image: z.string().optional(),
  duration: z.enum(["8", "6", "4"]).default("8").transform(Number),
  start_frame: z.string().optional(),
  last_frame: z.string().optional(),
  negative_prompt: z.string().optional(),
  resolution: z.enum(["720p", "1080p"]).default("1080p"),
  aspect_ratio: z.enum(["16:9", "9:16", "1:1"]).default("16:9"),
  generate_audio: z.boolean().default(true),
  seed: z.number().optional(),
});

// -----------------------------------------------------------
// unified video output schema
// -----------------------------------------------------------
const VideoModelOutput = z.object({
  videos: z
    .object({
      url: z.string(),
    })
    .array()
    .min(1),
});

export namespace VideoGen {
  // -----------------------------------------------------------
  // contract
  export type KlingV25TurboProInput = z.infer<typeof KlingV25TurboProInput>;
  export type Veo31FastInput = z.infer<typeof Veo31FastInput>;
  export type VideoModelOutput = z.infer<typeof VideoModelOutput>;

  export type ModelType = "kling-v2.5-turbo-pro" | "veo-3.1-fast";

  // -----------------------------------------------------------
  // model handlers
  // -----------------------------------------------------------
  async function runKlingV25TurboPro(
    input: KlingV25TurboProInput,
  ): Promise<VideoModelOutput> {
    const parsed = KlingV25TurboProInput.parse(input);
    console.log("generating video with kling-v2.5-turbo-pro", parsed);

    const output = await replicate.run("kwaivgi/kling-v2.5-turbo-pro", {
      input: parsed,
    });

    // Handle the output based on its type
    let videoUrl: string | null = null;
    if (output && typeof output === "object" && "url" in output) {
      const urlFunc = (output as { url: () => string }).url;
      if (typeof urlFunc === "function") {
        videoUrl = urlFunc();
      }
    }

    if (!videoUrl)
      throw new Error("No video URL returned from Kling V2.5 Turbo Pro");

    return {
      videos: [{ url: String(videoUrl) }],
    };
  }

  async function runVeo31Fast(
    input: Veo31FastInput,
  ): Promise<VideoModelOutput> {
    const parsed = Veo31FastInput.parse(input);
    console.log("generating video with veo-3.1-fast", parsed);
    const output = await replicate.run("google/veo-3.1-fast", {
      input: parsed,
    });

    // Handle the output based on its type
    let videoUrl: string | null = null;
    if (output && typeof output === "object" && "url" in output) {
      const urlFunc = (output as { url: () => string }).url;
      if (typeof urlFunc === "function") {
        videoUrl = urlFunc();
      }
    }

    if (!videoUrl) throw new Error("No video URL returned from VEO 3.1 Fast");

    return {
      videos: [{ url: String(videoUrl) }],
    };
  }

  // -----------------------------------------------------------
  // model registry
  // -----------------------------------------------------------
  const modelHandlers = {
    "kling-v2.5-turbo-pro": runKlingV25TurboPro,
    "veo-3.1-fast": runVeo31Fast,
  } as const;

  type ModelInputMap = {
    "kling-v2.5-turbo-pro": KlingV25TurboProInput;
    "veo-3.1-fast": Veo31FastInput;
  };

  // -----------------------------------------------------------
  // single unified function to call different video models
  // -----------------------------------------------------------
  export async function run<T extends ModelType>(
    model: T,
    input: ModelInputMap[T],
  ): Promise<VideoModelOutput> {
    const handler = modelHandlers[model];
    if (!handler) {
      throw new Error(`Unknown model: ${model}`);
    }
    // biome-ignore lint/suspicious/noExplicitAny: ok
    return (handler as (input: any) => Promise<VideoModelOutput>)(input);
  }
}
