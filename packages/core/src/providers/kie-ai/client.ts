import { omitUndefined } from "@core/utils/common";
import type { ZodType } from "zod";
import type {
  ApiResponse,
  CreateTaskResponse,
  FileUploadResponse,
  TaskDetailsResponse,
  TaskResultPayload,
} from "./schemas";
import {
  ApiResponseSchema,
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

// (Veo 3.1 handled in models.ts)

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

  // Veo 3.1 methods removed — handled via models and generic client

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
      onPoll?: (attempt: number, maxAttempt: number) => void;
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
      options?.onPoll?.(attempt + 1, maxAttempts);
      await sleepFn(pollIntervalMs);
    }

    throw new KieAIError(
      408,
      `Polling timed out after ${maxAttempts} attempts`,
    );
  }

  /**
   * Create a task using a generic model identifier and a params object.
   * Keys in `params` are converted from camelCase to snake_case automatically.
   */
  async createGenericTask(
    model: string,
    params: unknown,
    callbackUrl?: string,
  ): Promise<CreateTaskResponse> {
    const input = omitUndefined(
      convertKeysToSnakeCase(params) as Record<string, unknown>,
    );
    return this.createTask(model, input, callbackUrl);
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

function convertKeysToSnakeCase(value: unknown): unknown {
  if (value === null || value === undefined) return value;

  if (Array.isArray(value)) {
    return value.map((v) => convertKeysToSnakeCase(v));
  }

  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      // convert camelCase or PascalCase to snake_case
      const snake = k
        .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
        .replace(/([A-Z])([A-Z][a-z])/g, "$1_$2")
        .replace(/^_+|_+$/g, "")
        .toLowerCase();

      out[snake] = convertKeysToSnakeCase(v);
    }
    return out;
  }

  return value;
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
