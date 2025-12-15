import { env } from "@core/utils/env";
import z from "zod";
import { makeApiCall } from "./client";

// Schemas
const UploadImageResponse = z.object({
  id: z.string(),
  type: z.string(),
  created_at: z.string(),
  filename: z.string(),
  extension: z.string(),
  mime_type: z.string(),
  url: z.string(),
  width: z.number(),
  height: z.number(),
  duration_sec: z.number().nullable(),
  n_frames: z.number(),
  size_bytes: z.number(),
  thumbnail_url: z.string(),
});

const CreateVideoRequest = z.object({
  prompt: z.string().max(2000),
  orientation: z.enum(["portrait", "landscape"]).optional().default("portrait"),
  media_id: z
    .string()
    .regex(/^media_/)
    .optional(),
});

const CreateVideoResponse = z.object({
  code: z.number(),
  data: z.object({
    id: z.string().regex(/^task_/),
    priority: z.number(),
  }),
});

const TaskStatusResponse = z.object({
  id: z.string().regex(/^task_/),
  status: z.enum(["queued", "processing", "succeeded", "failed"]),
  prompt: z.string(),
  progress_pct: z.number(),
  generations: z
    .array(
      z.object({
        id: z.string().regex(/^gen_/),
        kind: z.string(),
        url: z.string(),
        downloadable_url: z.string(),
        width: z.number(),
        height: z.number(),
        created_at: z.string().optional(),
        prompt: z.string().optional(),
        encodings: z
          .object({
            source: z.object({ path: z.string() }).optional(),
            source_wm: z.object({ path: z.string() }).optional(),
            thumbnail: z.object({ path: z.string() }).optional(),
            md: z.object({ path: z.string() }).optional(),
            gif: z.object({ path: z.string() }).optional(),
          })
          .optional(),
      }),
    )
    .optional(),
});

const TaskDetailResponse = z.object({
  post: z.object({
    id: z.string(),
    text: z.string(),
    attachments: z.array(
      z.object({
        id: z.string(),
        kind: z.string(),
        generation_id: z.string().regex(/^gen_/),
        url: z.string(), // watermark-free video URL
        downloadable_url: z.string(), // watermarked video URL
        width: z.number(),
        height: z.number(),
        encodings: z.object({
          source: z.object({ path: z.string() }),
          source_wm: z.object({ path: z.string() }),
          thumbnail: z.object({ path: z.string() }),
          md: z.object({ path: z.string() }),
          gif: z.object({ path: z.string() }),
        }),
      }),
    ),
  }),
});

// Types
export type CreateVideoParams = z.infer<typeof CreateVideoRequest>;
export type VideoGeneration = z.infer<typeof TaskStatusResponse>;
export type VideoDetail = z.infer<typeof TaskDetailResponse>;

// API Functions
export async function uploadImage(
  file: Buffer,
  filename: string,
  mimeType: string,
): Promise<z.infer<typeof UploadImageResponse>> {
  // Create a Blob from the Buffer
  const arrayBuffer = file.buffer.slice(
    file.byteOffset,
    file.byteOffset + file.byteLength,
  ) as ArrayBuffer;
  const blob = new Blob([arrayBuffer], { type: mimeType });
  const formData = new FormData();
  formData.append("file", blob, filename);

  const response = await fetch(
    "https://api.tikhub.io/api/v1/sora2/upload_image",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.TIKHUB_API_TOKEN}`,
      },
      body: formData,
    },
  );

  if (!response.ok) {
    throw new Error(
      `Image upload failed: ${response.status} ${response.statusText}`,
    );
  }

  const data = await response.json();
  return UploadImageResponse.parse(data);
}

export async function createVideo(
  params: CreateVideoParams,
): Promise<z.infer<typeof CreateVideoResponse>> {
  const validatedParams = CreateVideoRequest.parse(params);

  const data = await makeApiCall<z.infer<typeof CreateVideoResponse>>(
    "/api/v1/sora2/create_video",
    {
      method: "POST",
      body: JSON.stringify(validatedParams),
    },
  );

  return CreateVideoResponse.parse(data);
}

export async function getTaskStatus(taskId: string): Promise<VideoGeneration> {
  if (!taskId.startsWith("task_")) {
    throw new Error("Invalid task ID: must start with 'task_'");
  }

  const data = await makeApiCall<VideoGeneration>(
    `/api/v1/sora2/get_task_status?task_id=${taskId}`,
    {
      method: "GET",
    },
  );

  return TaskStatusResponse.parse(data);
}

export async function getTaskDetail(params: {
  taskId?: string;
  generationId?: string;
}): Promise<VideoDetail> {
  if (!params.taskId && !params.generationId) {
    throw new Error("Either taskId or generationId must be provided");
  }

  if (params.taskId && !params.taskId.startsWith("task_")) {
    throw new Error("Invalid task ID: must start with 'task_'");
  }

  if (params.generationId && !params.generationId.startsWith("gen_")) {
    throw new Error("Invalid generation ID: must start with 'gen_'");
  }

  const queryParams = new URLSearchParams();
  if (params.taskId) queryParams.append("task_id", params.taskId);
  if (params.generationId)
    queryParams.append("generation_id", params.generationId);

  const data = await makeApiCall<VideoDetail>(
    `/api/v1/sora2/get_task_detail?${queryParams.toString()}`,
    {
      method: "GET",
    },
  );

  return TaskDetailResponse.parse(data);
}

export async function waitForTaskCompletion(
  taskId: string,
  pollInterval: number = 2000,
  timeout: number = 300000,
): Promise<VideoGeneration> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const status = await getTaskStatus(taskId);

    if (status.status === "succeeded" || status.status === "failed") {
      return status;
    }

    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }

  throw new Error(
    `Task ${taskId} did not complete within ${timeout}ms timeout`,
  );
}
