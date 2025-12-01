import { omitUndefined } from "@core/utils/common";
import type { ZodType } from "zod";
import type {
  ApiResponse,
  ByteDanceDuration,
  ByteDanceResolution,
  CreateTaskResponse,
  FileUploadResponse,
  FrameDuration,
  GrokAspectRatio,
  GrokMode,
  IdeogramImageSize,
  IdeogramNumImages,
  IdeogramRenderingSpeed,
  IdeogramStyle,
  NanoBananaAspectRatio,
  NanoBananaOutputFormat,
  NanoBananaResolution,
  StoryboardAspectRatio,
  TaskDetailsResponse,
  TaskResultPayload,
  Veo31AspectRatio,
  Veo31ExtendVideoResponse,
  Veo31GenerateVideoResponse,
  Veo31GenerationType,
  Veo31Model,
  Veo31Video1080pResponse,
  Veo31VideoDetailsResponse,
} from "./schemas";
import {
  ApiResponseSchema,
  CreateTaskResponseSchema,
  FileUploadResponseSchema,
  parseTaskResultPayload,
  TaskDetailsResponseSchema,
  Veo31ExtendVideoResponseSchema,
  Veo31GenerateVideoResponseSchema,
  Veo31Video1080pResponseSchema,
  Veo31VideoDetailsResponseSchema,
} from "./schemas";

type SchemaOutput<T extends ZodType> = T["_output"];

const DEFAULT_BASE_URL = "https://api.kie.ai";
const UPLOAD_BASE_URL = "https://kieai.redpandaai.co";

export interface KieAIClientOptions {
  apiKey: string;
  baseUrl?: string;
}

export interface CreateNanoBananaTaskParams {
  prompt: string;
  imageInput?: string[];
  aspectRatio?: NanoBananaAspectRatio;
  resolution?: NanoBananaResolution;
  outputFormat?: NanoBananaOutputFormat;
  callbackUrl?: string;
}

export interface StoryboardShotInput {
  scene: string;
  duration: number;
  Scene?: string;
}

export interface StoryboardTaskParams {
  shots: StoryboardShotInput[];
  nFrames: FrameDuration;
  aspectRatio?: StoryboardAspectRatio;
  imageUrls?: string[];
  callbackUrl?: string;
}

export interface ByteDanceTaskParams {
  prompt: string;
  imageUrl: string;
  resolution?: ByteDanceResolution;
  duration?: ByteDanceDuration;
  callbackUrl?: string;
}

export interface GrokImageToVideoTaskParams {
  prompt?: string;
  imageUrls?: string[];
  taskId?: string;
  index?: number;
  mode?: GrokMode;
  callbackUrl?: string;
}

export interface GrokTextToVideoTaskParams {
  prompt: string;
  aspectRatio?: GrokAspectRatio;
  mode?: GrokMode;
  callbackUrl?: string;
}

export interface GrokTextToImageTaskParams {
  prompt: string;
  aspectRatio?: GrokAspectRatio;
  mode?: GrokMode;
  callbackUrl?: string;
}

export interface GrokUpscaleTaskParams {
  taskId: string;
  callbackUrl?: string;
}

export interface SoraWatermarkRemoverTaskParams {
  videoUrl: string;
  callbackUrl?: string;
}

export interface IdeogramCharacterEditTaskParams {
  prompt: string;
  imageUrl: string;
  maskUrl: string;
  referenceImageUrls: string[];
  renderingSpeed?: IdeogramRenderingSpeed;
  style?: IdeogramStyle;
  expandPrompt?: boolean;
  numImages?: IdeogramNumImages;
  seed?: number;
  callbackUrl?: string;
}

export interface IdeogramCharacterRemixTaskParams {
  prompt: string;
  imageUrl: string;
  referenceImageUrls: string[];
  renderingSpeed?: IdeogramRenderingSpeed;
  style?: IdeogramStyle;
  expandPrompt?: boolean;
  imageSize?: IdeogramImageSize;
  numImages?: IdeogramNumImages;
  seed?: number;
  strength?: number;
  negativePrompt?: string;
  imageUrls?: string[];
  referenceMaskUrls?: string;
  callbackUrl?: string;
}

export interface IdeogramCharacterTaskParams {
  prompt: string;
  referenceImageUrls: string[];
  renderingSpeed?: IdeogramRenderingSpeed;
  style?: IdeogramStyle;
  expandPrompt?: boolean;
  numImages?: IdeogramNumImages;
  imageSize?: IdeogramImageSize;
  seed?: number;
  negativePrompt?: string;
  callbackUrl?: string;
}

export interface UploadFileUrlParams {
  fileUrl: string;
  uploadPath: string;
  fileName?: string;
}

export interface UploadFileBase64Params extends UploadFileUrlParams {
  base64Data: string;
}

export interface UploadFileStreamParams {
  file: Blob | BufferSource;
  uploadPath: string;
  fileName?: string;
}

// ===== VEO 3.1 INTERFACES =====

export interface Veo31GenerateVideoParams {
  prompt: string;
  imageUrls?: string[];
  model?: Veo31Model;
  generationType?: Veo31GenerationType;
  aspectRatio?: Veo31AspectRatio;
  seeds?: number;
  callbackUrl?: string;
  enableTranslation?: boolean;
  watermark?: string;
}

export interface Veo31ExtendVideoParams {
  taskId: string;
  prompt: string;
  seeds?: number;
  watermark?: string;
  callbackUrl?: string;
}

export class KieAIError extends Error {
  constructor(
    public readonly code: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "KieAIError";
  }
}

export class KieAIClient {
  private readonly baseUrl: string;

  constructor(private readonly options: KieAIClientOptions) {
    this.baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
  }

  async createNanoBananaTask(
    params: CreateNanoBananaTaskParams,
  ): Promise<CreateTaskResponse> {
    const input = omitUndefined({
      prompt: params.prompt,
      image_input: params.imageInput,
      aspect_ratio: params.aspectRatio,
      resolution: params.resolution,
      output_format: params.outputFormat,
    });

    return this.createTask("nano-banana-pro", input, params.callbackUrl);
  }

  async createStoryboardTask(
    params: StoryboardTaskParams,
  ): Promise<CreateTaskResponse> {
    const shots = params.shots.map((shot) => ({
      Scene: shot.Scene ?? shot.scene,
      duration: shot.duration,
    }));

    const input = omitUndefined({
      shots,
      n_frames: params.nFrames,
      aspect_ratio: params.aspectRatio,
      image_urls: params.imageUrls,
    });

    return this.createTask("sora-2-pro-storyboard", input, params.callbackUrl);
  }

  async createByteDanceTask(
    params: ByteDanceTaskParams,
  ): Promise<CreateTaskResponse> {
    const input = omitUndefined({
      prompt: params.prompt,
      image_url: params.imageUrl,
      resolution: params.resolution,
      duration: params.duration,
    });

    return this.createTask(
      "bytedance/v1-pro-fast-image-to-video",
      input,
      params.callbackUrl,
    );
  }

  async createGrokImageToVideoTask(
    params: GrokImageToVideoTaskParams,
  ): Promise<CreateTaskResponse> {
    const input = omitUndefined({
      prompt: params.prompt,
      image_urls: params.imageUrls,
      task_id: params.taskId,
      index: params.index,
      mode: params.mode,
    });

    return this.createTask(
      "grok-imagine/image-to-video",
      input,
      params.callbackUrl,
    );
  }

  async createGrokTextToVideoTask(
    params: GrokTextToVideoTaskParams,
  ): Promise<CreateTaskResponse> {
    const input = omitUndefined({
      prompt: params.prompt,
      aspect_ratio: params.aspectRatio,
      mode: params.mode,
    });

    return this.createTask(
      "grok-imagine/text-to-video",
      input,
      params.callbackUrl,
    );
  }

  async createGrokTextToImageTask(
    params: GrokTextToImageTaskParams,
  ): Promise<CreateTaskResponse> {
    const input = omitUndefined({
      prompt: params.prompt,
      aspect_ratio: params.aspectRatio,
      mode: params.mode,
    });

    return this.createTask(
      "grok-imagine/text-to-image",
      input,
      params.callbackUrl,
    );
  }

  async createGrokUpscaleTask(
    params: GrokUpscaleTaskParams,
  ): Promise<CreateTaskResponse> {
    const input = { task_id: params.taskId };

    return this.createTask("grok-imagine/upscale", input, params.callbackUrl);
  }

  async createSoraWatermarkRemoverTask(
    params: SoraWatermarkRemoverTaskParams,
  ): Promise<CreateTaskResponse> {
    return this.createTask(
      "sora-watermark-remover",
      { video_url: params.videoUrl },
      params.callbackUrl,
    );
  }

  async createIdeogramCharacterEditTask(
    params: IdeogramCharacterEditTaskParams,
  ): Promise<CreateTaskResponse> {
    const input = omitUndefined({
      prompt: params.prompt,
      image_url: params.imageUrl,
      mask_url: params.maskUrl,
      reference_image_urls: params.referenceImageUrls,
      rendering_speed: params.renderingSpeed,
      style: params.style,
      expand_prompt: params.expandPrompt,
      num_images: params.numImages,
      seed: params.seed,
    });

    return this.createTask(
      "ideogram/character-edit",
      input,
      params.callbackUrl,
    );
  }

  async createIdeogramCharacterRemixTask(
    params: IdeogramCharacterRemixTaskParams,
  ): Promise<CreateTaskResponse> {
    const input = omitUndefined({
      prompt: params.prompt,
      image_url: params.imageUrl,
      reference_image_urls: params.referenceImageUrls,
      rendering_speed: params.renderingSpeed,
      style: params.style,
      expand_prompt: params.expandPrompt,
      image_size: params.imageSize,
      num_images: params.numImages,
      seed: params.seed,
      strength: params.strength,
      negative_prompt: params.negativePrompt,
      image_urls: params.imageUrls,
      reference_mask_urls: params.referenceMaskUrls,
    });

    return this.createTask(
      "ideogram/character-remix",
      input,
      params.callbackUrl,
    );
  }

  async createIdeogramCharacterTask(
    params: IdeogramCharacterTaskParams,
  ): Promise<CreateTaskResponse> {
    const input = omitUndefined({
      prompt: params.prompt,
      reference_image_urls: params.referenceImageUrls,
      rendering_speed: params.renderingSpeed,
      style: params.style,
      expand_prompt: params.expandPrompt,
      num_images: params.numImages,
      image_size: params.imageSize,
      seed: params.seed,
      negative_prompt: params.negativePrompt,
    });

    return this.createTask("ideogram/character", input, params.callbackUrl);
  }

  async getTaskDetails(taskId: string): Promise<TaskDetailsResponse> {
    const url = new URL(`${this.baseUrl}/api/v1/jobs/recordInfo`);
    url.searchParams.set("taskId", taskId);

    return this.request(
      url.toString(),
      { method: "GET" },
      TaskDetailsResponseSchema,
    );
  }

  async uploadFileUrl(
    params: UploadFileUrlParams,
  ): Promise<FileUploadResponse> {
    const payload = omitUndefined({
      fileUrl: params.fileUrl,
      uploadPath: normalizeUploadPath(params.uploadPath),
      fileName: params.fileName,
    });

    return this.request(
      `${UPLOAD_BASE_URL}/api/file-url-upload`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      FileUploadResponseSchema,
    );
  }

  async uploadFileBase64(
    params: UploadFileBase64Params,
  ): Promise<FileUploadResponse> {
    const payload = omitUndefined({
      base64Data: params.base64Data,
      uploadPath: normalizeUploadPath(params.uploadPath),
      fileName: params.fileName,
    });

    return this.request(
      `${UPLOAD_BASE_URL}/api/file-base64-upload`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      FileUploadResponseSchema,
    );
  }

  async uploadFileStream(
    params: UploadFileStreamParams,
  ): Promise<FileUploadResponse> {
    const body = new FormData();
    body.set("uploadPath", normalizeUploadPath(params.uploadPath));
    if (params.fileName) {
      body.set("fileName", params.fileName);
    }

    const binary =
      params.file instanceof Blob ? params.file : new Blob([params.file]);
    body.set("file", binary, params.fileName ?? "file");

    return this.request(
      `${UPLOAD_BASE_URL}/api/file-stream-upload`,
      {
        method: "POST",
        body,
      },
      FileUploadResponseSchema,
    );
  }

  async extractResultUrls(details: TaskDetailsResponse): Promise<string[]> {
    const data = details.data;
    if (!data) {
      throw new Error("Missing task details");
    }

    if (data.state !== "success") {
      throw new Error(`Task is not successful (state=${data.state})`);
    }

    if (data.response?.resultUrls?.length) {
      return data.response.resultUrls;
    }

    const payload = parseTaskResultPayload(data.resultJson ?? null);
    if (payload?.resultUrls?.length) {
      return payload.resultUrls;
    }

    throw new Error("No result URLs found on task success");
  }

  async getTaskResultPayload(
    details: TaskDetailsResponse,
  ): Promise<TaskResultPayload | null> {
    return parseTaskResultPayload(details.data?.resultJson ?? null);
  }

  // ===== VEO 3.1 METHODS =====

  /**
   * Generate a video using Veo 3.1.
   *
   * @param params - Video generation parameters
   * @returns Task response with taskId for tracking
   */
  async veo31GenerateVideo(
    params: Veo31GenerateVideoParams,
  ): Promise<Veo31GenerateVideoResponse> {
    const payload = omitUndefined({
      prompt: params.prompt,
      imageUrls: params.imageUrls,
      model: params.model ?? "veo3_fast",
      generationType: params.generationType,
      aspectRatio: params.aspectRatio ?? "9:16",
      seeds: params.seeds,
      callBackUrl: params.callbackUrl,
      enableTranslation: params.enableTranslation ?? true,
      watermark: params.watermark,
    });

    return this.request(
      `${this.baseUrl}/api/v1/veo/generate`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      Veo31GenerateVideoResponseSchema,
    );
  }

  /**
   * Extend an existing Veo 3.1 video.
   *
   * @param params - Video extension parameters
   * @returns Task response with taskId for tracking
   */
  async veo31ExtendVideo(
    params: Veo31ExtendVideoParams,
  ): Promise<Veo31ExtendVideoResponse> {
    const payload = omitUndefined({
      taskId: params.taskId,
      prompt: params.prompt,
      seeds: params.seeds,
      watermark: params.watermark,
      callBackUrl: params.callbackUrl,
    });

    return this.request(
      `${this.baseUrl}/api/v1/veo/extend`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      Veo31ExtendVideoResponseSchema,
    );
  }

  /**
   * Get video generation task details and status.
   *
   * @param taskId - Task ID from video generation
   * @returns Video details including status and result URLs
   */
  async veo31GetVideoDetails(
    taskId: string,
  ): Promise<Veo31VideoDetailsResponse> {
    const url = new URL(`${this.baseUrl}/api/v1/veo/record-info`);
    url.searchParams.set("taskId", taskId);

    return this.request(
      url.toString(),
      { method: "GET" },
      Veo31VideoDetailsResponseSchema,
    );
  }

  /**
   * Get the 1080P version of a generated video.
   *
   * @param taskId - Task ID from video generation
   * @param index - Optional video index
   * @returns 1080P video URL
   */
  async veo31Get1080pVideo(
    taskId: string,
    index?: number,
  ): Promise<Veo31Video1080pResponse> {
    const url = new URL(`${this.baseUrl}/api/v1/veo/get-1080p-video`);
    url.searchParams.set("taskId", taskId);
    if (index !== undefined) {
      url.searchParams.set("index", String(index));
    }

    return this.request(
      url.toString(),
      { method: "GET" },
      Veo31Video1080pResponseSchema,
    );
  }

  /**
   * Poll Veo 3.1 task until complete.
   * Returns the video URL when done or throws on failure.
   *
   * @param taskId - Task ID to poll
   * @param pollIntervalMs - Polling interval in milliseconds (default: 10000)
   * @param maxAttempts - Maximum polling attempts (default: 60)
   * @param sleepFn - Custom sleep function (e.g., Cloudflare Workflows step.sleep)
   */
  async veo31PollUntilComplete(
    taskId: string,
    pollIntervalMs = 10000,
    maxAttempts = 60,
    sleepFn: (ms: number) => Promise<void> = (ms) =>
      new Promise((resolve) => setTimeout(resolve, ms)),
  ): Promise<string> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const details = await this.veo31GetVideoDetails(taskId);
      const data = details.data;

      if (!data) {
        throw new KieAIError(500, "No data in task details response");
      }

      // successFlag: 0=generating, 1=success, 2=failed, 3=generation_failed
      if (data.successFlag === 1) {
        const resultUrls = data.response?.resultUrls;
        if (resultUrls && resultUrls.length > 0) {
          return resultUrls[0];
        }
        throw new KieAIError(500, "Task succeeded but no result URLs found");
      }

      if (data.successFlag === 2 || data.successFlag === 3) {
        throw new KieAIError(
          500,
          data.errorMessage ??
            `Video generation failed (flag=${data.successFlag})`,
        );
      }

      // Still generating, wait and retry
      console.log(`[veo31] Polling attempt ${attempt + 1}/${maxAttempts}...`);
      await sleepFn(pollIntervalMs);
    }

    throw new KieAIError(
      408,
      `Polling timed out after ${maxAttempts} attempts`,
    );
  }

  /**
   * Generic poll task until complete.
   * Works with any task type that uses the standard getTaskDetails endpoint.
   * Returns the first result URL when done or throws on failure.
   *
   * @param taskId - Task ID to poll
   * @param options - Polling options
   */
  async pollTaskUntilComplete(
    taskId: string,
    options?: {
      pollIntervalMs?: number;
      maxAttempts?: number;
      logPrefix?: string;
      /** Custom sleep function (e.g., Cloudflare Workflows step.sleep) */
      sleepFn?: (ms: number) => Promise<void>;
    },
  ): Promise<string> {
    const pollIntervalMs = options?.pollIntervalMs ?? 10000;
    const maxAttempts = options?.maxAttempts ?? 180; // 30 min default for longer tasks
    const logPrefix = options?.logPrefix ?? "kie-ai";
    const sleepFn =
      options?.sleepFn ??
      ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const details = await this.getTaskDetails(taskId);
      const data = details.data;

      if (!data) {
        throw new KieAIError(500, "No data in task details response");
      }

      if (data.state === "success") {
        // Parse resultJson to get URLs
        if (data.resultJson) {
          const resultJson = data.resultJson;
          const result =
            typeof resultJson === "string"
              ? (JSON.parse(resultJson) as { resultUrls?: string[] })
              : (resultJson as { resultUrls?: string[] });
          const urls = result.resultUrls ?? [];
          if (urls.length > 0) {
            return urls[0];
          }
        }
        throw new KieAIError(500, "Task succeeded but no result URLs found");
      }

      if (data.state === "fail") {
        throw new KieAIError(500, data.failMsg ?? "Task failed");
      }

      // Still processing, wait and retry
      console.log(
        `[${logPrefix}] Polling attempt ${attempt + 1}/${maxAttempts}...`,
      );
      await sleepFn(pollIntervalMs);
    }

    throw new KieAIError(
      408,
      `Polling timed out after ${maxAttempts} attempts`,
    );
  }

  private async createTask(
    model: string,
    input: Record<string, unknown>,
    callbackUrl?: string,
  ): Promise<CreateTaskResponse> {
    const payload = omitUndefined({
      model,
      callBackUrl: callbackUrl,
      input,
    });

    return this.request(
      `${this.baseUrl}/api/v1/jobs/createTask`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      CreateTaskResponseSchema,
    );
  }

  private async request<T extends ZodType>(
    url: string,
    init: RequestInit,
    schema: T,
  ): Promise<SchemaOutput<T>> {
    const headers = this.buildHeaders(init.headers, init.body);

    const response = await fetch(url, {
      ...init,
      headers,
    });

    const raw = await response.text();

    let parsedJson: unknown;
    try {
      parsedJson = raw ? JSON.parse(raw) : {};
    } catch (parseError) {
      throw new KieAIError(response.status, "Invalid JSON response", {
        raw,
        status: response.status,
        parseError,
      });
    }

    const parsed = schema.safeParse(parsedJson);
    if (!parsed.success) {
      const fallback = ApiResponseSchema.safeParse(
        buildFallbackApiResponse(parsedJson, response.status, raw),
      );

      if (fallback.success) {
        throw new KieAIError(fallback.data.code, fallback.data.msg, {
          ...fallback.data,
          zodIssues: parsed.error.format(),
        });
      }

      throw new KieAIError(response.status, "Unexpected response schema", {
        raw,
        status: response.status,
        zodIssues: parsed.error.format(),
      });
    }

    const parsedResponse = parsed.data as ApiResponse;
    if (parsedResponse.code !== 200) {
      throw new KieAIError(
        parsedResponse.code,
        parsedResponse.msg,
        parsedResponse,
      );
    }

    return parsed.data;
  }

  private buildHeaders(
    headers: HeadersInit | undefined,
    body: BodyInit | null | undefined,
  ) {
    const finalHeaders: Record<string, string> = {
      Authorization: `Bearer ${this.options.apiKey}`,
    };

    if (body && !(body instanceof FormData)) {
      finalHeaders["Content-Type"] = "application/json";
    }

    if (headers) {
      const headerObj =
        typeof headers === "function"
          ? {}
          : headers instanceof Headers
            ? Object.fromEntries(headers.entries())
            : headers;
      Object.assign(finalHeaders, headerObj);
    }

    return finalHeaders;
  }
}

function normalizeUploadPath(path: string) {
  return path.replace(/^\/+|\/+$/g, "");
}

function buildFallbackApiResponse(
  payload: unknown,
  status: number,
  raw: string,
): ApiResponse {
  if (payload && typeof payload === "object") {
    const maybeApi = payload as Partial<ApiResponse>;
    const fallbackData = Object.hasOwn(maybeApi, "data")
      ? maybeApi.data
      : payload;

    return {
      code: typeof maybeApi.code === "number" ? maybeApi.code : status,
      msg:
        typeof maybeApi.msg === "string"
          ? maybeApi.msg
          : `Unexpected response schema (HTTP ${status})`,
      data: fallbackData,
      rawData: payload,
    } as ApiResponse;
  }

  return {
    code: status,
    msg: `Unexpected response schema (HTTP ${status})`,
    data: payload,
    rawData: raw,
  } as ApiResponse;
}
