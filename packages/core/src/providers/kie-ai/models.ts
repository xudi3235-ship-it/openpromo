import { env } from "@core/utils/env";
import { z } from "zod";
import { KieAIClient, KieAIError } from "./client";

// ---------------------------------------------------------------------------
// KIE AI Models - Namespace-based API
// ---------------------------------------------------------------------------

/**
 * KIE AI Models API
 *
 * This provides a simplified, namespace-based interface for KIE AI models.
 * All task creation and polling complexity is handled internally.
 *
 * @example
 * ```typescript
 * import { KieAI } from '@openpromo/core/providers/kie-ai/models';
 *
 * // Generate an image
 * const imageUrl = await KieAI.NanoBanana.run({
 *   prompt: "A beautiful sunset over mountains",
 *   aspectRatio: "16:9"
 * });
 *
 * // Generate a video
 * const videoUrl = await KieAI.Kling26ImageToVideo.run({
 *   prompt: "A cat playing with a ball",
 *   imageUrls: ["https://example.com/image.jpg"]
 * });
 * ```
 */
export namespace KieAI {
  // -------------------------------------------------------------------------
  // Image Generation Models
  // -------------------------------------------------------------------------

  export namespace NanoBanana {
    export const schema = z.object({
      prompt: z.string(),
      imageInput: z.array(z.string()).optional(),
      aspectRatio: z
        .enum([
          "1:1",
          "2:3",
          "3:2",
          "3:4",
          "4:3",
          "4:5",
          "5:4",
          "9:16",
          "16:9",
          "21:9",
        ])
        .optional(),
      resolution: z.enum(["1K", "2K", "4K"]).optional(),
      outputFormat: z.enum(["png", "jpg"]).optional(),
      callbackUrl: z.string().optional(),
    });
    export type Input = z.input<typeof schema>;

    /**
     * Generate images using NanoBanana model
     * @param input - Generation parameters
     * @returns Promise resolving to array of image URLs
     */
    export async function run(input: Input): Promise<string[]> {
      const parsed = schema.parse(input);
      const client = new KieAIClient({ apiKey: env.KIE_AI_API_KEY });

      const task = await client.createGenericTask("nano-banana-pro", parsed);
      const taskId = task.data?.taskId;
      if (!taskId)
        throw new KieAIError(500, "No task ID returned from NanoBanana");

      const resultUrl = await client.pollTaskUntilComplete(taskId, {
        logPrefix: "NanoBanana",
        pollIntervalMs: 5000,
        maxAttempts: 60,
      });

      return [resultUrl];
    }
  }

  export namespace ZImage {
    export const schema = z.object({
      prompt: z.string(),
      aspectRatio: z.enum(["1:1", "4:3", "3:4", "16:9", "9:16"]).optional(),
    });
    export type Input = z.input<typeof schema>;

    /**
     * Generate images using ZImage model
     * @param input - Generation parameters
     * @returns Promise resolving to array of image URLs
     */
    export async function run(input: Input): Promise<string[]> {
      const parsed = schema.parse(input);
      const client = new KieAIClient({ apiKey: env.KIE_AI_API_KEY });

      const task = await client.createGenericTask("z-image", parsed);
      const taskId = task.data?.taskId;
      if (!taskId) throw new KieAIError(500, "No task ID returned from ZImage");

      const resultUrl = await client.pollTaskUntilComplete(taskId, {
        logPrefix: "ZImage",
        pollIntervalMs: 5000,
        maxAttempts: 60,
      });

      return [resultUrl];
    }
  }

  export namespace IdeogramCharacter {
    export const schema = z.object({
      prompt: z.string(),
      referenceImageUrls: z.array(z.string()).optional(),
      renderingSpeed: z.enum(["TURBO", "BALANCED", "QUALITY"]).optional(),
      style: z.enum(["AUTO", "REALISTIC", "FICTION"]).optional(),
      expandPrompt: z.boolean().optional(),
      numImages: z.enum(["1", "2", "3", "4"]).optional(),
      imageSize: z
        .enum([
          "square",
          "square_hd",
          "portrait_4_3",
          "portrait_16_9",
          "landscape_4_3",
          "landscape_16_9",
        ])
        .optional(),
      seed: z.number().optional(),
      negativePrompt: z.string().optional(),
    });
    export type Input = z.input<typeof schema>;

    /**
     * Generate character images using Ideogram
     * @param input - Generation parameters
     * @returns Promise resolving to array of image URLs
     */
    export async function run(input: Input): Promise<string[]> {
      const parsed = schema.parse(input);
      const client = new KieAIClient({ apiKey: env.KIE_AI_API_KEY });

      const payload = {
        ...parsed,
        referenceImageUrls: parsed.referenceImageUrls || [],
      };
      const task = await client.createGenericTask(
        "ideogram/character",
        payload,
      );
      const taskId = task.data?.taskId;
      if (!taskId)
        throw new KieAIError(500, "No task ID returned from IdeogramCharacter");

      const resultUrl = await client.pollTaskUntilComplete(taskId, {
        logPrefix: "IdeogramCharacter",
        pollIntervalMs: 5000,
        maxAttempts: 60,
      });

      return [resultUrl];
    }
  }

  export namespace IdeogramCharacterEdit {
    export const schema = z.object({
      prompt: z.string(),
      imageUrl: z.string(),
      maskUrl: z.string().optional(),
      referenceImageUrls: z.array(z.string()).optional(),
      renderingSpeed: z.enum(["TURBO", "BALANCED", "QUALITY"]).optional(),
      style: z.enum(["AUTO", "REALISTIC", "FICTION"]).optional(),
      expandPrompt: z.boolean().optional(),
      numImages: z.enum(["1", "2", "3", "4"]).optional(),
      seed: z.number().optional(),
    });
    export type Input = z.input<typeof schema>;

    /**
     * Edit character images using Ideogram
     * @param input - Edit parameters
     * @returns Promise resolving to array of image URLs
     */
    export async function run(input: Input): Promise<string[]> {
      const parsed = schema.parse(input);
      const client = new KieAIClient({ apiKey: env.KIE_AI_API_KEY });

      const payload = {
        ...parsed,
        maskUrl: parsed.maskUrl || "",
        referenceImageUrls: parsed.referenceImageUrls || [],
      };
      const task = await client.createGenericTask(
        "ideogram/character-edit",
        payload,
      );
      const taskId = task.data?.taskId;
      if (!taskId)
        throw new KieAIError(
          500,
          "No task ID returned from IdeogramCharacterEdit",
        );

      const resultUrl = await client.pollTaskUntilComplete(taskId, {
        logPrefix: "IdeogramCharacterEdit",
        pollIntervalMs: 5000,
        maxAttempts: 60,
      });

      return [resultUrl];
    }
  }

  export namespace IdeogramCharacterRemix {
    export const schema = z.object({
      prompt: z.string(),
      imageUrl: z.string(),
      referenceImageUrls: z.array(z.string()).optional(),
      renderingSpeed: z.enum(["TURBO", "BALANCED", "QUALITY"]).optional(),
      style: z.enum(["AUTO", "REALISTIC", "FICTION"]).optional(),
      expandPrompt: z.boolean().optional(),
      imageSize: z
        .enum([
          "square",
          "square_hd",
          "portrait_4_3",
          "portrait_16_9",
          "landscape_4_3",
          "landscape_16_9",
        ])
        .optional(),
      numImages: z.enum(["1", "2", "3", "4"]).optional(),
      seed: z.number().optional(),
      strength: z.number().optional(),
      negativePrompt: z.string().optional(),
      imageUrls: z.array(z.string()).optional(),
      referenceMaskUrls: z.string().optional(),
    });
    export type Input = z.input<typeof schema>;

    /**
     * Remix character images using Ideogram
     * @param input - Remix parameters
     * @returns Promise resolving to array of image URLs
     */
    export async function run(input: Input): Promise<string[]> {
      const parsed = schema.parse(input);
      const client = new KieAIClient({ apiKey: env.KIE_AI_API_KEY });
      const task = await client.createGenericTask(
        "ideogram/character-remix",
        parsed,
      );
      const taskId = task.data?.taskId;
      if (!taskId)
        throw new KieAIError(
          500,
          "No task ID returned from IdeogramCharacterRemix",
        );

      const resultUrl = await client.pollTaskUntilComplete(taskId, {
        logPrefix: "IdeogramCharacterRemix",
        pollIntervalMs: 5000,
        maxAttempts: 60,
      });

      return [resultUrl];
    }
  }

  export namespace SeeDream45TextToImage {
    export const schema = z.object({
      prompt: z.string(),
      aspectRatio: z
        .enum(["1:1", "4:3", "3:4", "16:9", "9:16", "2:3", "3:2", "21:9"])
        .optional(),
      quality: z.enum(["basic", "high"]).optional(),
    });
    export type Input = z.input<typeof schema>;

    /**
     * Generate images using SeeDream 4.5
     * @param input - Generation parameters
     * @returns Promise resolving to array of image URLs
     */
    export async function run(input: Input): Promise<string[]> {
      const parsed = schema.parse(input);
      const client = new KieAIClient({ apiKey: env.KIE_AI_API_KEY });

      const task = await client.createGenericTask(
        "seedream/4.5-text-to-image",
        parsed,
      );
      const taskId = task.data?.taskId;
      if (!taskId)
        throw new KieAIError(
          500,
          "No task ID returned from SeeDream45TextToImage",
        );

      const resultUrl = await client.pollTaskUntilComplete(taskId, {
        logPrefix: "SeeDream45TextToImage",
        pollIntervalMs: 5000,
        maxAttempts: 60,
      });

      return [resultUrl];
    }
  }

  export namespace SeeDream45Edit {
    export const schema = z.object({
      prompt: z.string(),
      imageUrls: z.array(z.string()),
      aspectRatio: z
        .enum(["1:1", "4:3", "3:4", "16:9", "9:16", "2:3", "3:2", "21:9"])
        .optional(),
      quality: z.enum(["basic", "high"]).optional(),
    });
    export type Input = z.input<typeof schema>;

    /**
     * Edit images using SeeDream 4.5
     * @param input - Edit parameters
     * @returns Promise resolving to array of image URLs
     */
    export async function run(input: Input): Promise<string[]> {
      const parsed = schema.parse(input);
      const client = new KieAIClient({ apiKey: env.KIE_AI_API_KEY });

      const task = await client.createGenericTask("seedream/4.5-edit", parsed);
      const taskId = task.data?.taskId;
      if (!taskId)
        throw new KieAIError(500, "No task ID returned from SeeDream45Edit");

      const resultUrl = await client.pollTaskUntilComplete(taskId, {
        logPrefix: "SeeDream45Edit",
        pollIntervalMs: 5000,
        maxAttempts: 60,
      });

      return [resultUrl];
    }
  }

  export namespace GrokTextToImage {
    export const schema = z.object({
      prompt: z.string(),
      aspectRatio: z.enum(["1:1", "2:3", "3:2"]).optional(),
      mode: z.enum(["fun", "normal", "spicy"]).optional(),
    });
    export type Input = z.input<typeof schema>;

    /**
     * Generate images using Grok
     * @param input - Generation parameters
     * @returns Promise resolving to array of image URLs
     */
    export async function run(input: Input): Promise<string[]> {
      const parsed = schema.parse(input);
      const client = new KieAIClient({ apiKey: env.KIE_AI_API_KEY });

      const task = await client.createGenericTask(
        "grok-imagine/text-to-image",
        parsed,
      );
      const taskId = task.data?.taskId;
      if (!taskId)
        throw new KieAIError(500, "No task ID returned from GrokTextToImage");

      const resultUrl = await client.pollTaskUntilComplete(taskId, {
        logPrefix: "GrokTextToImage",
        pollIntervalMs: 5000,
        maxAttempts: 60,
      });

      return [resultUrl];
    }
  }

  export namespace GrokUpscale {
    export const schema = z.object({
      taskId: z.string(),
    });
    export type Input = z.input<typeof schema>;

    /**
     * Upscale images using Grok
     * @param input - Upscale parameters
     * @returns Promise resolving to array of image URLs
     */
    export async function run(input: Input): Promise<string[]> {
      const parsed = schema.parse(input);
      const client = new KieAIClient({ apiKey: env.KIE_AI_API_KEY });

      const task = await client.createGenericTask(
        "grok-imagine/upscale",
        parsed,
      );
      const taskId = task.data?.taskId;
      if (!taskId)
        throw new KieAIError(500, "No task ID returned from GrokUpscale");

      const resultUrl = await client.pollTaskUntilComplete(taskId, {
        logPrefix: "GrokUpscale",
        pollIntervalMs: 5000,
        maxAttempts: 60,
      });

      return [resultUrl];
    }
  }

  // -------------------------------------------------------------------------
  // Video Generation Models
  // -------------------------------------------------------------------------

  export namespace Kling26ImageToVideo {
    export const schema = z.object({
      prompt: z.string(),
      imageUrls: z.array(z.string()),
      sound: z.boolean().optional(),
      duration: z.enum(["5", "10"]).optional(),
    });
    export type Input = z.input<typeof schema>;

    /**
     * Generate video from image using Kling 2.6
     * @param input - Video generation parameters
     * @returns Promise resolving to video URL
     */
    export async function run(input: Input): Promise<string> {
      const parsed = schema.parse(input);
      const client = new KieAIClient({ apiKey: env.KIE_AI_API_KEY });

      const task = await client.createGenericTask(
        "kling-2.6/image-to-video",
        parsed,
      );
      const taskId = task.data?.taskId;
      if (!taskId)
        throw new KieAIError(
          500,
          "No task ID returned from Kling26ImageToVideo",
        );

      return await client.pollTaskUntilComplete(taskId, {
        logPrefix: "Kling26ImageToVideo",
        pollIntervalMs: 10000,
        maxAttempts: 180,
      });
    }
  }

  export namespace Sora2Storyboard {
    export const schema = z.object({
      shots: z.array(
        z.object({
          scene: z.string(),
          duration: z.number(),
          Scene: z.string().optional(),
        }),
      ),
      nFrames: z.enum(["10", "15", "25"]),
      aspectRatio: z.enum(["portrait", "landscape"]).optional(),
      imageUrls: z.array(z.string()).optional(),
    });
    export type Input = z.input<typeof schema>;

    export interface RunOptions {
      onPoll?: (attempt: number, maxAttempts: number) => void;
    }

    /**
     * Generate storyboard video using Sora 2 Storyboard
     * @param input - Storyboard generation parameters
     * @param options - Optional callbacks for polling progress
     * @returns Promise resolving to video URL
     */
    export async function run(
      input: Input,
      options?: RunOptions,
    ): Promise<string> {
      const parsed = schema.parse(input);
      const client = new KieAIClient({ apiKey: env.KIE_AI_API_KEY });

      const task = await client.createGenericTask(
        "sora-2-pro-storyboard",
        parsed,
      );
      const taskId = task.data?.taskId;
      if (!taskId)
        throw new KieAIError(500, "No task ID returned from Sora2Storyboard");

      return await client.pollTaskUntilComplete(taskId, {
        logPrefix: "Sora2Storyboard",
        pollIntervalMs: 15000,
        maxAttempts: 480,
        onPoll: options?.onPoll,
      });
    }
  }
  export namespace Sora2ImageToVideo {
    export const schema = z.object({
      prompt: z.string(),
      imageUrls: z.array(z.string()),
      aspectRatio: z.enum(["portrait", "landscape"]).optional(),
      nFrames: z.enum(["10", "15"]).optional(),
      removeWatermark: z.boolean().optional(),
      callbackUrl: z.string().optional(),
    });
    export type Input = z.input<typeof schema>;

    export interface RunOptions {
      onPoll?: (attempt: number, maxAttempts: number) => void;
    }

    /**
     * Generate video from image using Sora 2
     * @param input - Video generation parameters
     * @param options - Optional callbacks for polling progress
     * @returns Promise resolving to video URL
     */
    export async function run(
      input: Input,
      options?: RunOptions,
    ): Promise<string> {
      const parsed = schema.parse(input);
      const client = new KieAIClient({ apiKey: env.KIE_AI_API_KEY });

      const task = await client.createGenericTask(
        "sora-2-image-to-video",
        {
          prompt: parsed.prompt,
          imageUrls: parsed.imageUrls,
          aspectRatio: parsed.aspectRatio,
          nFrames: parsed.nFrames,
          removeWatermark: parsed.removeWatermark,
        },
        parsed.callbackUrl,
      );
      const taskId = task.data?.taskId;
      if (!taskId)
        throw new KieAIError(500, "No task ID returned from Sora2ImageToVideo");

      return await client.pollTaskUntilComplete(taskId, {
        logPrefix: "Sora2ImageToVideo",
        pollIntervalMs: 15000,
        maxAttempts: 240,
        onPoll: options?.onPoll,
      });
    }
  }

  export namespace Sora2ProImageToVideo {
    export const schema = z.object({
      prompt: z.string(),
      imageUrls: z.array(z.string()),
      aspectRatio: z.enum(["portrait", "landscape"]).optional(),
      nFrames: z.enum(["10", "15"]).optional(),
      size: z.enum(["standard", "high"]).optional(),
      removeWatermark: z.boolean().optional(),
      callbackUrl: z.string().optional(),
    });
    export type Input = z.input<typeof schema>;

    export interface RunOptions {
      onPoll?: (attempt: number, maxAttempts: number) => void;
    }

    /**
     * Generate video from image using Sora 2 Pro (higher quality)
     * @param input - Video generation parameters
     * @param options - Optional callbacks for polling progress
     * @returns Promise resolving to video URL
     */
    export async function run(
      input: Input,
      options?: RunOptions,
    ): Promise<string> {
      const parsed = schema.parse(input);
      const client = new KieAIClient({ apiKey: env.KIE_AI_API_KEY });

      const task = await client.createGenericTask(
        "sora-2-pro-image-to-video",
        {
          prompt: parsed.prompt,
          imageUrls: parsed.imageUrls,
          aspectRatio: parsed.aspectRatio,
          nFrames: parsed.nFrames,
          size: parsed.size,
          removeWatermark: parsed.removeWatermark,
        },
        parsed.callbackUrl,
      );
      const taskId = task.data?.taskId;
      if (!taskId)
        throw new KieAIError(
          500,
          "No task ID returned from Sora2ProImageToVideo",
        );

      return await client.pollTaskUntilComplete(taskId, {
        logPrefix: "Sora2ProImageToVideo",
        pollIntervalMs: 15000,
        maxAttempts: 240,
        onPoll: options?.onPoll,
      });
    }
  }

  export namespace ByteDance {
    export const schema = z.object({
      prompt: z.string(),
      imageUrl: z.string(),
      resolution: z.enum(["720p", "1080p"]).optional(),
      duration: z.enum(["5", "10"]).optional(),
    });
    export type Input = z.input<typeof schema>;

    /**
     * Generate video using ByteDance
     * @param input - Video generation parameters
     * @returns Promise resolving to video URL
     */
    export async function run(input: Input): Promise<string> {
      const parsed = schema.parse(input);
      const client = new KieAIClient({ apiKey: env.KIE_AI_API_KEY });

      const task = await client.createGenericTask(
        "bytedance/v1-pro-fast-image-to-video",
        parsed,
      );
      const taskId = task.data?.taskId;
      if (!taskId)
        throw new KieAIError(500, "No task ID returned from ByteDance");

      return await client.pollTaskUntilComplete(taskId, {
        logPrefix: "ByteDance",
        pollIntervalMs: 10000,
        maxAttempts: 180,
      });
    }
  }

  export namespace Wan25ImageToVideo {
    export const schema = z.object({
      prompt: z.string(),
      imageUrl: z.string(),
      duration: z.enum(["5", "10"]).optional(),
      resolution: z.enum(["720p", "1080p"]).optional(),
      negativePrompt: z.string().optional(),
      enablePromptExpansion: z.boolean().optional(),
      seed: z.number().optional(),
    });
    export type Input = z.input<typeof schema>;

    /**
     * Generate video from image using WAN 2.5
     * @param input - Video generation parameters
     * @returns Promise resolving to video URL
     */
    export async function run(input: Input): Promise<string> {
      const parsed = schema.parse(input);
      const client = new KieAIClient({ apiKey: env.KIE_AI_API_KEY });

      const task = await client.createGenericTask(
        "wan/2-5-image-to-video",
        parsed,
      );
      const taskId = task.data?.taskId;
      if (!taskId)
        throw new KieAIError(500, "No task ID returned from Wan25ImageToVideo");

      return await client.pollTaskUntilComplete(taskId, {
        logPrefix: "Wan25ImageToVideo",
        pollIntervalMs: 10000,
        maxAttempts: 180,
      });
    }
  }

  export namespace GrokImageToVideo {
    export const schema = z.object({
      prompt: z.string().optional(),
      imageUrls: z.array(z.string()).optional(),
      taskId: z.string().optional(),
      index: z.number().optional(),
      mode: z.enum(["fun", "normal", "spicy"]).optional(),
    });
    export type Input = z.input<typeof schema>;

    /**
     * Generate video from image using Grok
     * @param input - Video generation parameters
     * @returns Promise resolving to video URL
     */
    export async function run(input: Input): Promise<string> {
      const parsed = schema.parse(input);
      const client = new KieAIClient({ apiKey: env.KIE_AI_API_KEY });

      const task = await client.createGenericTask(
        "grok-imagine/image-to-video",
        parsed,
      );
      const taskId = task.data?.taskId;
      if (!taskId)
        throw new KieAIError(500, "No task ID returned from GrokImageToVideo");

      return await client.pollTaskUntilComplete(taskId, {
        logPrefix: "GrokImageToVideo",
        pollIntervalMs: 10000,
        maxAttempts: 180,
      });
    }
  }

  export namespace GrokTextToVideo {
    export const schema = z.object({
      prompt: z.string(),
      aspectRatio: z.enum(["1:1", "2:3", "3:2"]).optional(),
      mode: z.enum(["fun", "normal", "spicy"]).optional(),
    });
    export type Input = z.input<typeof schema>;

    /**
     * Generate video from text using Grok
     * @param input - Video generation parameters
     * @returns Promise resolving to video URL
     */
    export async function run(input: Input): Promise<string> {
      const parsed = schema.parse(input);
      const client = new KieAIClient({ apiKey: env.KIE_AI_API_KEY });

      const task = await client.createGenericTask(
        "grok-imagine/text-to-video",
        parsed,
      );
      const taskId = task.data?.taskId;
      if (!taskId)
        throw new KieAIError(500, "No task ID returned from GrokTextToVideo");

      return await client.pollTaskUntilComplete(taskId, {
        logPrefix: "GrokTextToVideo",
        pollIntervalMs: 10000,
        maxAttempts: 180,
      });
    }
  }

  export namespace SoraWatermarkRemover {
    export const schema = z.object({
      videoUrl: z.string(),
    });
    export type Input = z.input<typeof schema>;

    /**
     * Remove watermark from Sora videos
     * @param input - Watermark removal parameters
     * @returns Promise resolving to video URL
     */
    export async function run(input: Input): Promise<string> {
      const parsed = schema.parse(input);
      const client = new KieAIClient({ apiKey: env.KIE_AI_API_KEY });

      const task = await client.createGenericTask(
        "sora-watermark-remover",
        parsed,
      );
      const taskId = task.data?.taskId;
      if (!taskId)
        throw new KieAIError(
          500,
          "No task ID returned from SoraWatermarkRemover",
        );

      return await client.pollTaskUntilComplete(taskId, {
        logPrefix: "SoraWatermarkRemover",
        pollIntervalMs: 10000,
        maxAttempts: 180,
      });
    }
  }

  // -------------------------------------------------------------------------
  // Special Case - Veo 3.1 (Custom Polling)
  // -------------------------------------------------------------------------

  export namespace Veo31 {
    export const schema = z.object({
      prompt: z.string(),
      imageUrls: z.array(z.string()).optional(),
      model: z.enum(["veo3", "veo3_fast"]).default("veo3_fast"),
      generationType: z
        .enum([
          "TEXT_2_VIDEO",
          "FIRST_AND_LAST_FRAMES_2_VIDEO",
          "REFERENCE_2_VIDEO",
        ])
        .optional(),
      aspectRatio: z.enum(["16:9", "9:16", "Auto"]).default("9:16").optional(),
      seeds: z.number().optional(),
      callbackUrl: z.string().optional(),
      callBackUrl: z.string().optional(),
      watermark: z.string().optional(),
    });
    export type Input = z.input<typeof schema>;

    export interface ExtendParams {
      taskId: string;
      prompt: string;
      seeds?: number;
      watermark?: string;
      callbackUrl?: string;
      callBackUrl?: string;
    }

    /**
     * Generate video using Veo 3.1
     * @param input - Video generation parameters
     * @returns Promise resolving to video URL
     */
    export async function run(
      input: Input,
      opts?: {
        onPoll: (attempt: number, maxAttempts: number) => void;
      },
    ): Promise<string> {
      const parsed = schema.parse(input);
      const client = new KieAIClient({ apiKey: env.KIE_AI_API_KEY });
      const task = await client.generateVeo31Video({
        prompt: parsed.prompt,
        imageUrls: parsed.imageUrls,
        model: parsed.model ?? "veo3_fast",
        generationType: parsed.generationType,
        aspectRatio: parsed.aspectRatio,
        seeds: parsed.seeds,
        callBackUrl: parsed.callBackUrl ?? parsed.callbackUrl,
        watermark: parsed.watermark,
      });

      const taskId = task.data?.taskId;
      if (!taskId) throw new KieAIError(500, "No task ID returned from Veo31");

      return await client.pollVeo31UntilComplete(taskId, {
        logPrefix: "Veo31",
        pollIntervalMs: 10000,
        maxAttempts: 180,
        onPoll: opts?.onPoll,
      });
    }

    /**
     * Extend an existing Veo 3.1 video
     * @param input - Extension parameters
     * @returns Promise resolving to extended video URL
     */
    export async function extend(input: ExtendParams): Promise<string> {
      const client = new KieAIClient({ apiKey: env.KIE_AI_API_KEY });
      const task = await client.extendVeo31Video({
        taskId: input.taskId,
        prompt: input.prompt,
        seeds: input.seeds,
        watermark: input.watermark,
        callBackUrl: input.callBackUrl ?? input.callbackUrl,
      });
      const taskId = task.data?.taskId;
      if (!taskId)
        throw new KieAIError(500, "No task ID returned from Veo31.extend");

      return await client.pollVeo31UntilComplete(taskId, {
        logPrefix: "Veo31.extend",
        pollIntervalMs: 10000,
        maxAttempts: 180,
      });
    }

    /**
     * Upscale a Veo 3.1 video to 1080p
     * @param taskId - The task ID to upscale
     * @returns Promise resolving to upscaled video URL
     */
    export async function upscale1080p(taskId: string): Promise<string> {
      const client = new KieAIClient({ apiKey: env.KIE_AI_API_KEY });

      const response = await client.getVeo31Video1080p(taskId);
      const resultUrl = response.data?.resultUrl;
      if (!resultUrl)
        throw new KieAIError(
          500,
          "No result URL returned from Veo31.upscale1080p",
        );

      return resultUrl;
    }
  }
}
