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
} from "./schemas";
import {
  CreateTaskResponseSchema,
  FileUploadResponseSchema,
  parseTaskResultPayload,
  TaskDetailsResponseSchema,
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
      throw new KieAIError(
        response.status,
        "Unexpected response schema",
        parsed.error.format(),
      );
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
