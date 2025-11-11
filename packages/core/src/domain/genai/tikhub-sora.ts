import { env } from "@core/utils/env";
import z from "zod";

// -----------------------------------------------------------
// Zod Schemas for TikHub Sora API
// -----------------------------------------------------------

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

// -----------------------------------------------------------
// Helper functions for API calls
// -----------------------------------------------------------

async function makeApiCall<T>(url: string, options: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${env.TIKHUB_API_TOKEN}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(
      `API call failed: ${response.status} ${response.statusText}`,
    );
  }

  return response.json();
}

// -----------------------------------------------------------
// TikHub Sora API Functions
// -----------------------------------------------------------

export namespace TikHubSora {
  /**
   * Upload an image to get a media_id for video generation
   * @param file The image data as a Buffer
   * @param filename The name of the file (e.g., "image.png")
   * @param mimeType The MIME type of the file (e.g., "image/png")
   * @returns The media_id and image information
   */
  export async function uploadImage(
    file: Buffer,
    filename: string,
    mimeType: string,
  ): Promise<z.infer<typeof UploadImageResponse>> {
    // Create a Blob from the Buffer
    const blob = new Blob([file], { type: mimeType });

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

  /**
   * Create a video from text or image+text
   * @param params Video creation parameters
   * @returns Task ID for tracking video generation progress
   */
  export async function createVideo(
    params: z.infer<typeof CreateVideoRequest>,
  ): Promise<z.infer<typeof CreateVideoResponse>> {
    const validatedParams = CreateVideoRequest.parse(params);

    const data = await makeApiCall<z.infer<typeof CreateVideoResponse>>(
      "https://api.tikhub.io/api/v1/sora2/create_video",
      {
        method: "POST",
        body: JSON.stringify(validatedParams),
      },
    );

    return CreateVideoResponse.parse(data);
  }

  /**
   * Get the status of a video generation task
   * @param taskId The task ID returned from createVideo
   * @returns Current status and progress of the video generation
   */
  export async function getTaskStatus(
    taskId: string,
  ): Promise<z.infer<typeof TaskStatusResponse>> {
    if (!taskId.startsWith("task_")) {
      throw new Error("Invalid task ID: must start with 'task_'");
    }

    const data = await makeApiCall<z.infer<typeof TaskStatusResponse>>(
      `https://api.tikhub.io/api/v1/sora2/get_task_status?task_id=${taskId}`,
      {
        method: "GET",
      },
    );

    return TaskStatusResponse.parse(data);
  }

  /**
   * Get the detailed result of a completed video generation task (watermark-free)
   * @param params Either taskId or generationId
   * @returns Detailed post information with watermark-free video URLs
   */
  export async function getTaskDetail(params: {
    taskId?: string;
    generationId?: string;
  }): Promise<z.infer<typeof TaskDetailResponse>> {
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

    const data = await makeApiCall<z.infer<typeof TaskDetailResponse>>(
      `https://api.tikhub.io/api/v1/sora2/get_task_detail?${queryParams.toString()}`,
      {
        method: "GET",
      },
    );

    return TaskDetailResponse.parse(data);
  }

  /**
   * Wait for a video generation task to complete
   * @param taskId The task ID to monitor
   * @param pollInterval Interval in milliseconds between status checks (default: 2000ms)
   * @param timeout Maximum time to wait in milliseconds (default: 300000ms/5min)
   * @returns The completed task status
   */
  export async function waitForTaskCompletion(
    taskId: string,
    pollInterval: number = 2000,
    timeout: number = 300000,
  ): Promise<z.infer<typeof TaskStatusResponse>> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const status = await getTaskStatus(taskId);

      if (status.status === "succeeded" || status.status === "failed") {
        return status;
      }

      // Wait before polling again
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    throw new Error(
      `Task ${taskId} did not complete within ${timeout}ms timeout`,
    );
  }
}
