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
  // Midjourney Models
  // -------------------------------------------------------------------------

  /**
   * Midjourney Image & Video Generation
   *
   * Collection of Midjourney AI models for image and video generation.
   *
   * @example
   * ```typescript
   * // Text-to-Image
   * const imageUrls = await KieAI.Midjourney.TextToImage.run({
   *   prompt: "A beautiful sunset over mountains",
   *   aspectRatio: "16:9",
   *   speed: "fast",
   * });
   *
   * // Image-to-Image
   * const editedUrls = await KieAI.Midjourney.ImageToImage.run({
   *   prompt: "Make it more vibrant",
   *   fileUrls: ["https://example.com/image.jpg"],
   *   speed: "turbo",
   * });
   *
   * // Image-to-Video
   * const videoUrls = await KieAI.Midjourney.ImageToVideo.run({
   *   prompt: "Animate this scene",
   *   fileUrls: ["https://example.com/image.jpg"],
   * });
   * ```
   */
  export namespace Midjourney {
    /** Aspect ratio options */
    export const AspectRatio = z.enum([
      "1:2",
      "9:16",
      "2:3",
      "3:4",
      "5:6",
      "6:5",
      "4:3",
      "3:2",
      "1:1",
      "16:9",
      "2:1",
    ]);

    /** Speed mode options */
    export const Speed = z.enum(["relaxed", "fast", "turbo"]);

    /** Midjourney model version options */
    export const Version = z.enum(["7", "6.1", "6", "5.2", "5.1", "niji6"]);

    export namespace TextToImage {
      export const schema = z.object({
        prompt: z.string().max(2000),
        speed: Speed.optional(),
        aspectRatio: AspectRatio.optional(),
        version: Version.optional(),
        variety: z.number().min(0).max(100).optional(),
        stylization: z.number().min(0).max(1000).optional(),
        weirdness: z.number().min(0).max(3000).optional(),
        waterMark: z.string().optional(),
        callBackUrl: z.string().optional(),
      });
      export type Input = z.input<typeof schema>;

      /**
       * Generate images from text using Midjourney
       * @param input - Generation parameters
       * @returns Promise resolving to array of image URLs (typically 4)
       */
      export async function run(input: Input): Promise<string[]> {
        const parsed = schema.parse(input);
        const client = new KieAIClient({ apiKey: env.KIE_AI_API_KEY });

        const task = await client.createMidjourneyTask({
          taskType: "mj_txt2img",
          prompt: parsed.prompt,
          speed: parsed.speed,
          aspectRatio: parsed.aspectRatio,
          version: parsed.version,
          variety: parsed.variety,
          stylization: parsed.stylization,
          weirdness: parsed.weirdness,
          waterMark: parsed.waterMark,
          callBackUrl: parsed.callBackUrl,
        });
        const taskId = task.data?.taskId;
        if (!taskId)
          throw new KieAIError(
            500,
            "No task ID returned from Midjourney.TextToImage",
          );

        return await pollMidjourneyTask(
          client,
          taskId,
          "Midjourney.TextToImage",
        );
      }
    }

    export namespace ImageToImage {
      export const schema = z.object({
        prompt: z.string().max(2000),
        fileUrls: z.array(z.string()),
        speed: Speed.optional(),
        aspectRatio: AspectRatio.optional(),
        version: Version.optional(),
        variety: z.number().min(0).max(100).optional(),
        stylization: z.number().min(0).max(1000).optional(),
        weirdness: z.number().min(0).max(3000).optional(),
        waterMark: z.string().optional(),
        callBackUrl: z.string().optional(),
      });
      export type Input = z.input<typeof schema>;

      /**
       * Generate images from an input image using Midjourney
       * @param input - Generation parameters
       * @returns Promise resolving to array of image URLs (typically 4)
       */
      export async function run(input: Input): Promise<string[]> {
        const parsed = schema.parse(input);
        const client = new KieAIClient({ apiKey: env.KIE_AI_API_KEY });

        const task = await client.createMidjourneyTask({
          taskType: "mj_img2img",
          prompt: parsed.prompt,
          fileUrls: parsed.fileUrls,
          speed: parsed.speed,
          aspectRatio: parsed.aspectRatio,
          version: parsed.version,
          variety: parsed.variety,
          stylization: parsed.stylization,
          weirdness: parsed.weirdness,
          waterMark: parsed.waterMark,
          callBackUrl: parsed.callBackUrl,
        });
        const taskId = task.data?.taskId;
        if (!taskId)
          throw new KieAIError(
            500,
            "No task ID returned from Midjourney.ImageToImage",
          );

        return await pollMidjourneyTask(
          client,
          taskId,
          "Midjourney.ImageToImage",
        );
      }
    }

    export namespace ImageToVideo {
      export const schema = z.object({
        prompt: z.string().max(2000),
        fileUrls: z.array(z.string()).max(1),
        aspectRatio: AspectRatio.optional(),
        waterMark: z.string().optional(),
        callBackUrl: z.string().optional(),
      });
      export type Input = z.input<typeof schema>;

      /**
       * Generate video from an input image using Midjourney
       * Note: fileUrls can only have one image link for video generation
       * @param input - Generation parameters
       * @returns Promise resolving to array of video URLs
       */
      export async function run(input: Input): Promise<string[]> {
        const parsed = schema.parse(input);
        const client = new KieAIClient({ apiKey: env.KIE_AI_API_KEY });

        const task = await client.createMidjourneyTask({
          taskType: "mj_video",
          prompt: parsed.prompt,
          fileUrls: parsed.fileUrls,
          aspectRatio: parsed.aspectRatio,
          waterMark: parsed.waterMark,
          callBackUrl: parsed.callBackUrl,
        });
        const taskId = task.data?.taskId;
        if (!taskId)
          throw new KieAIError(
            500,
            "No task ID returned from Midjourney.ImageToVideo",
          );

        return await pollMidjourneyTask(
          client,
          taskId,
          "Midjourney.ImageToVideo",
          15000,
          240,
        );
      }
    }

    export namespace StyleReference {
      export const schema = z.object({
        prompt: z.string().max(2000),
        fileUrls: z.array(z.string()),
        speed: Speed.optional(),
        aspectRatio: AspectRatio.optional(),
        version: Version.optional(),
        variety: z.number().min(0).max(100).optional(),
        stylization: z.number().min(0).max(1000).optional(),
        weirdness: z.number().min(0).max(3000).optional(),
        waterMark: z.string().optional(),
        callBackUrl: z.string().optional(),
      });
      export type Input = z.input<typeof schema>;

      /**
       * Generate images using style reference from input images
       * @param input - Generation parameters
       * @returns Promise resolving to array of image URLs
       */
      export async function run(input: Input): Promise<string[]> {
        const parsed = schema.parse(input);
        const client = new KieAIClient({ apiKey: env.KIE_AI_API_KEY });

        const task = await client.createMidjourneyTask({
          taskType: "mj_style_reference",
          prompt: parsed.prompt,
          fileUrls: parsed.fileUrls,
          speed: parsed.speed,
          aspectRatio: parsed.aspectRatio,
          version: parsed.version,
          variety: parsed.variety,
          stylization: parsed.stylization,
          weirdness: parsed.weirdness,
          waterMark: parsed.waterMark,
          callBackUrl: parsed.callBackUrl,
        });
        const taskId = task.data?.taskId;
        if (!taskId)
          throw new KieAIError(
            500,
            "No task ID returned from Midjourney.StyleReference",
          );

        return await pollMidjourneyTask(
          client,
          taskId,
          "Midjourney.StyleReference",
        );
      }
    }

    export namespace OmniReference {
      export const schema = z.object({
        prompt: z.string().max(2000),
        fileUrls: z.array(z.string()),
        ow: z.number().min(1).max(1000).optional(),
        aspectRatio: AspectRatio.optional(),
        waterMark: z.string().optional(),
        callBackUrl: z.string().optional(),
      });
      export type Input = z.input<typeof schema>;

      /**
       * Generate images using omni reference (characters, objects, vehicles, creatures)
       * from reference images
       * @param input - Generation parameters
       * @returns Promise resolving to array of image URLs
       */
      export async function run(input: Input): Promise<string[]> {
        const parsed = schema.parse(input);
        const client = new KieAIClient({ apiKey: env.KIE_AI_API_KEY });

        const task = await client.createMidjourneyTask({
          taskType: "mj_omni_reference",
          prompt: parsed.prompt,
          fileUrls: parsed.fileUrls,
          ow: parsed.ow,
          aspectRatio: parsed.aspectRatio,
          waterMark: parsed.waterMark,
          callBackUrl: parsed.callBackUrl,
        });
        const taskId = task.data?.taskId;
        if (!taskId)
          throw new KieAIError(
            500,
            "No task ID returned from Midjourney.OmniReference",
          );

        return await pollMidjourneyTask(
          client,
          taskId,
          "Midjourney.OmniReference",
        );
      }
    }
  }

  /**
   * Helper function to poll Midjourney tasks until complete.
   * Returns all result URLs (typically 4 for image generation).
   */
  async function pollMidjourneyTask(
    client: KieAIClient,
    taskId: string,
    logPrefix: string,
    pollIntervalMs = 10000,
    maxAttempts = 120,
  ): Promise<string[]> {
    const sleep = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms));

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const details = await client.getTaskDetails(taskId);
      const data = details.data;

      if (!data) {
        throw new KieAIError(500, "No data in task details response");
      }

      if (data.state === "success") {
        if (data.resultJson) {
          const resultJson = data.resultJson;
          const result =
            typeof resultJson === "string"
              ? (JSON.parse(resultJson) as { resultUrls?: string[] })
              : (resultJson as { resultUrls?: string[] });
          const urls = result.resultUrls ?? [];
          if (urls.length > 0) {
            return urls;
          }
        }
        throw new KieAIError(500, "Task succeeded but no result URLs found");
      }

      if (data.state === "fail") {
        throw new KieAIError(500, data.failMsg ?? "Midjourney task failed");
      }

      console.log(
        `[${logPrefix}] Polling attempt ${attempt + 1}/${maxAttempts}...`,
      );
      await sleep(pollIntervalMs);
    }

    throw new KieAIError(
      408,
      `Midjourney polling timed out after ${maxAttempts} attempts`,
    );
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
      onTaskCreated?: (taskId: string) => void;
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

      options?.onTaskCreated?.(taskId);

      return await client.pollTaskUntilComplete(taskId, {
        logPrefix: "Sora2ImageToVideo",
        pollIntervalMs: 15000,
        maxAttempts: 200,
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
  // ElevenLabs Audio Models
  // -------------------------------------------------------------------------

  /**
   * ElevenLabs Audio Models
   *
   * Collection of ElevenLabs audio generation and processing models.
   *
   * @example
   * ```typescript
   * // Text-to-Speech
   * const audioUrl = await KieAI.ElevenLabs.TextToSpeechMultilingualV2.run({
   *   text: "Hello world",
   *   voice: "Rachel",
   * });
   *
   * // Sound Effects
   * const sfxUrl = await KieAI.ElevenLabs.SoundEffectV2.run({
   *   text: "Thunder rumbling",
   * });
   *
   * // Speech-to-Text
   * const result = await KieAI.ElevenLabs.SpeechToText.run({
   *   audio_url: "https://example.com/audio.mp3",
   * });
   * ```
   */
  export namespace ElevenLabs {
    /** Voice options available for TTS models */
    export const Voice = z.enum([
      "Rachel",
      "Aria",
      "Roger",
      "Sarah",
      "Laura",
      "Charlie",
      "George",
      "Callum",
      "River",
      "Liam",
      "Charlotte",
      "Alice",
      "Matilda",
      "Will",
      "Jessica",
      "Eric",
      "Chris",
      "Brian",
      "Daniel",
      "Lily",
      "Bill",
    ]);

    /** Output format options for audio generation */
    export const OutputFormat = z.enum([
      "mp3_22050_32",
      "mp3_44100_32",
      "mp3_44100_64",
      "mp3_44100_96",
      "mp3_44100_128",
      "mp3_44100_192",
      "pcm_8000",
      "pcm_16000",
      "pcm_22050",
      "pcm_24000",
      "pcm_44100",
      "pcm_48000",
      "ulaw_8000",
      "alaw_8000",
      "opus_48000_32",
      "opus_48000_64",
      "opus_48000_96",
      "opus_48000_128",
      "opus_48000_192",
    ]);

    export namespace TextToSpeechMultilingualV2 {
      export const schema = z.object({
        text: z.string().max(5000),
        voice: Voice.optional(),
        stability: z.number().min(0).max(1).optional(),
        similarity_boost: z.number().min(0).max(1).optional(),
        style: z.number().min(0).max(1).optional(),
        speed: z.number().min(0.7).max(1.2).optional(),
        timestamps: z.boolean().optional(),
        previous_text: z.string().max(5000).optional(),
        next_text: z.string().max(5000).optional(),
        language_code: z.string().max(500).optional(),
        callbackUrl: z.string().optional(),
      });
      export type Input = z.input<typeof schema>;

      /**
       * Generate speech using Text-to-Speech Multilingual V2
       * High-quality multilingual text-to-speech synthesis.
       * @param input - TTS generation parameters
       * @returns Promise resolving to audio URL
       */
      export async function run(input: Input): Promise<string> {
        const parsed = schema.parse(input);
        const client = new KieAIClient({ apiKey: env.KIE_AI_API_KEY });

        const { callbackUrl, ...payload } = parsed;
        const task = await client.createGenericTask(
          "elevenlabs/text-to-speech-multilingual-v2",
          payload,
          callbackUrl,
        );
        const taskId = task.data?.taskId;
        if (!taskId)
          throw new KieAIError(
            500,
            "No task ID returned from ElevenLabs.TextToSpeechMultilingualV2",
          );

        return await client.pollTaskUntilComplete(taskId, {
          logPrefix: "ElevenLabs.TextToSpeechMultilingualV2",
          pollIntervalMs: 3000,
          maxAttempts: 60,
        });
      }
    }

    export namespace TextToSpeechTurbo25 {
      export const schema = z.object({
        text: z.string().max(5000),
        voice: Voice.optional(),
        stability: z.number().min(0).max(1).optional(),
        similarity_boost: z.number().min(0).max(1).optional(),
        style: z.number().min(0).max(1).optional(),
        speed: z.number().min(0.7).max(1.2).optional(),
        timestamps: z.boolean().optional(),
        previous_text: z.string().max(5000).optional(),
        next_text: z.string().max(5000).optional(),
        language_code: z.string().max(500).optional(),
        callbackUrl: z.string().optional(),
      });
      export type Input = z.input<typeof schema>;

      /**
       * Generate speech using Text-to-Speech Turbo 2.5
       * Fast text-to-speech with language enforcement support.
       * @param input - TTS generation parameters
       * @returns Promise resolving to audio URL
       */
      export async function run(input: Input): Promise<string> {
        const parsed = schema.parse(input);
        const client = new KieAIClient({ apiKey: env.KIE_AI_API_KEY });

        const { callbackUrl, ...payload } = parsed;
        const task = await client.createGenericTask(
          "elevenlabs/text-to-speech-turbo-2-5",
          payload,
          callbackUrl,
        );
        const taskId = task.data?.taskId;
        if (!taskId)
          throw new KieAIError(
            500,
            "No task ID returned from ElevenLabs.TextToSpeechTurbo25",
          );

        return await client.pollTaskUntilComplete(taskId, {
          logPrefix: "ElevenLabs.TextToSpeechTurbo25",
          pollIntervalMs: 3000,
          maxAttempts: 60,
        });
      }
    }

    export namespace SoundEffectV2 {
      export const schema = z.object({
        text: z.string().max(5000),
        loop: z.boolean().optional(),
        duration_seconds: z.number().min(0.5).max(22).optional(),
        prompt_influence: z.number().min(0).max(1).optional(),
        output_format: OutputFormat.optional(),
        callbackUrl: z.string().optional(),
      });
      export type Input = z.input<typeof schema>;

      /**
       * Generate sound effects using Sound Effect V2
       * Create custom sound effects from text descriptions.
       * @param input - Sound effect generation parameters
       * @returns Promise resolving to audio URL
       */
      export async function run(input: Input): Promise<string> {
        const parsed = schema.parse(input);
        const client = new KieAIClient({ apiKey: env.KIE_AI_API_KEY });

        const { callbackUrl, ...payload } = parsed;
        const task = await client.createGenericTask(
          "elevenlabs/sound-effect-v2",
          payload,
          callbackUrl,
        );
        const taskId = task.data?.taskId;
        if (!taskId)
          throw new KieAIError(
            500,
            "No task ID returned from ElevenLabs.SoundEffectV2",
          );

        return await client.pollTaskUntilComplete(taskId, {
          logPrefix: "ElevenLabs.SoundEffectV2",
          pollIntervalMs: 3000,
          maxAttempts: 60,
        });
      }
    }

    export namespace AudioIsolation {
      export const schema = z.object({
        audio_url: z.string(),
        callbackUrl: z.string().optional(),
      });
      export type Input = z.input<typeof schema>;

      /**
       * Isolate voice from audio using Audio Isolation
       * Removes background noise and isolates human voice from audio files.
       * Supported formats: audio/mpeg, wav, aac, mp4, ogg (max 10MB)
       * @param input - Audio isolation parameters
       * @returns Promise resolving to isolated audio URL
       */
      export async function run(input: Input): Promise<string> {
        const parsed = schema.parse(input);
        const client = new KieAIClient({ apiKey: env.KIE_AI_API_KEY });

        const { callbackUrl, ...payload } = parsed;
        const task = await client.createGenericTask(
          "elevenlabs/audio-isolation",
          payload,
          callbackUrl,
        );
        const taskId = task.data?.taskId;
        if (!taskId)
          throw new KieAIError(
            500,
            "No task ID returned from ElevenLabs.AudioIsolation",
          );

        return await client.pollTaskUntilComplete(taskId, {
          logPrefix: "ElevenLabs.AudioIsolation",
          pollIntervalMs: 3000,
          maxAttempts: 60,
        });
      }
    }

    export namespace SpeechToText {
      /** Word/token in transcription result */
      export interface TranscriptWord {
        speaker_id: string;
        start: number;
        end: number;
        text: string;
        type: "word" | "spacing";
      }

      /** Transcription result structure */
      export interface TranscriptResult {
        language_code: string;
        language_probability: number;
        text: string;
        words: TranscriptWord[];
      }

      export const schema = z.object({
        audio_url: z.string(),
        language_code: z.string().max(500).optional(),
        tag_audio_events: z.boolean().optional(),
        diarize: z.boolean().optional(),
        callbackUrl: z.string().optional(),
      });
      export type Input = z.input<typeof schema>;

      /**
       * Transcribe audio using Speech-to-Text
       * Converts speech to text with speaker diarization and audio event tagging.
       * Supported formats: audio/mpeg, wav, aac, mp4, ogg (max 200MB)
       * @param input - Transcription parameters
       * @returns Promise resolving to transcription result
       */
      export async function run(input: Input): Promise<TranscriptResult> {
        const parsed = schema.parse(input);
        const client = new KieAIClient({ apiKey: env.KIE_AI_API_KEY });

        const { callbackUrl, ...payload } = parsed;
        const task = await client.createGenericTask(
          "elevenlabs/speech-to-text",
          payload,
          callbackUrl,
        );
        const taskId = task.data?.taskId;
        if (!taskId)
          throw new KieAIError(
            500,
            "No task ID returned from ElevenLabs.SpeechToText",
          );

        // Custom polling for STT since result is in resultObject, not resultUrls
        const pollIntervalMs = 3000;
        const maxAttempts = 120;
        const sleep = (ms: number) =>
          new Promise((resolve) => setTimeout(resolve, ms));

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          const details = await client.getTaskDetails(taskId);
          const data = details.data;

          if (!data) {
            throw new KieAIError(500, "No data in task details response");
          }

          if (data.state === "success") {
            if (data.resultJson) {
              const resultJson = data.resultJson;
              const result =
                typeof resultJson === "string"
                  ? (JSON.parse(resultJson) as {
                      resultObject?: TranscriptResult;
                    })
                  : (resultJson as { resultObject?: TranscriptResult });

              if (result.resultObject) {
                return result.resultObject;
              }
            }
            throw new KieAIError(
              500,
              "Task succeeded but no transcription result found",
            );
          }

          if (data.state === "fail") {
            throw new KieAIError(500, data.failMsg ?? "Task failed");
          }

          console.log(
            `[ElevenLabs.SpeechToText] Polling attempt ${attempt + 1}/${maxAttempts}...`,
          );
          await sleep(pollIntervalMs);
        }

        throw new KieAIError(
          408,
          `Polling timed out after ${maxAttempts} attempts`,
        );
      }
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
        onTaskCreated?: (taskId: string) => void;
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
      opts?.onTaskCreated?.(taskId);

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
