import { z } from "zod";

export const TaskStateSchema = z.enum([
  "waiting",
  "queuing",
  "generating",
  "success",
  "fail",
]);
export type TaskState = z.infer<typeof TaskStateSchema>;

export const TaskStatusSchema = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
  z.literal(3),
]);
export type TaskStatus = z.infer<typeof TaskStatusSchema>;

export const FrameDurationSchema = z.enum(["10", "15", "25"]);
export type FrameDuration = z.infer<typeof FrameDurationSchema>;

export const StoryboardAspectRatioSchema = z.enum(["portrait", "landscape"]);
export type StoryboardAspectRatio = z.infer<typeof StoryboardAspectRatioSchema>;

export const StoryboardShotSchema = z.object({
  Scene: z.string(),
  duration: z.number(),
});
export type StoryboardShot = z.infer<typeof StoryboardShotSchema>;

export const ByteDanceResolutionSchema = z.enum(["720p", "1080p"]);
export type ByteDanceResolution = z.infer<typeof ByteDanceResolutionSchema>;

export const ByteDanceDurationSchema = z.enum(["5", "10"]);
export type ByteDanceDuration = z.infer<typeof ByteDanceDurationSchema>;

export const GrokAspectRatioSchema = z.enum(["1:1", "2:3", "3:2"]);
export type GrokAspectRatio = z.infer<typeof GrokAspectRatioSchema>;

export const GrokModeSchema = z.enum(["fun", "normal", "spicy"]);
export type GrokMode = z.infer<typeof GrokModeSchema>;

export const IdeogramRenderingSpeedSchema = z.enum([
  "TURBO",
  "BALANCED",
  "QUALITY",
]);
export type IdeogramRenderingSpeed = z.infer<
  typeof IdeogramRenderingSpeedSchema
>;

export const IdeogramStyleSchema = z.enum(["AUTO", "REALISTIC", "FICTION"]);
export type IdeogramStyle = z.infer<typeof IdeogramStyleSchema>;

export const IdeogramImageSizeSchema = z.enum([
  "square",
  "square_hd",
  "portrait_4_3",
  "portrait_16_9",
  "landscape_4_3",
  "landscape_16_9",
]);
export type IdeogramImageSize = z.infer<typeof IdeogramImageSizeSchema>;

export const IdeogramNumImagesSchema = z.enum(["1", "2", "3", "4"]);
export type IdeogramNumImages = z.infer<typeof IdeogramNumImagesSchema>;

export const NanoBananaAspectRatioSchema = z.enum([
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
]);
export type NanoBananaAspectRatio = z.infer<typeof NanoBananaAspectRatioSchema>;

export const NanoBananaResolutionSchema = z.enum(["1K", "2K", "4K"]);
export type NanoBananaResolution = z.infer<typeof NanoBananaResolutionSchema>;

export const NanoBananaOutputFormatSchema = z.enum(["png", "jpg"]);
export type NanoBananaOutputFormat = z.infer<
  typeof NanoBananaOutputFormatSchema
>;

export const TaskResultPayloadSchema = z.object({
  resultUrls: z.array(z.string()).optional(),
  originUrls: z.array(z.string()).optional(),
});
export type TaskResultPayload = z.infer<typeof TaskResultPayloadSchema>;

export const ApiResponseSchema = z.object({
  code: z.number(),
  msg: z.string(),
  data: z.any().nullable().optional(),
});

export type ApiResponse = z.infer<typeof ApiResponseSchema>;

const TaskResponseDataSchema = z.object({
  taskId: z.string(),
});

export const CreateTaskResponseSchema = ApiResponseSchema.extend({
  data: TaskResponseDataSchema.optional(),
});
export type CreateTaskResponse = z.infer<typeof CreateTaskResponseSchema>;

const ResponseBodySchema = z.object({
  resultUrls: z.array(z.string()).optional(),
  originUrls: z.array(z.string()).optional(),
  resolution: z.string().nullable().optional(),
});

const TaskDetailsDataSchema = z.object({
  taskId: z.string(),
  state: TaskStateSchema,
  successFlag: z.number().optional(),
  response: ResponseBodySchema.optional(),
  resultJson: z
    .union([z.string(), z.record(z.string(), z.unknown())])
    .optional()
    .nullable(),
  failMsg: z.string().optional().nullable(),
  failCode: z.string().optional().nullable(),
  errorMessage: z.string().optional().nullable(),
  errorCode: z.string().optional().nullable(),
  createTime: z.union([z.string(), z.number()]).optional().nullable(),
  completeTime: z.union([z.string(), z.number()]).optional().nullable(),
  updateTime: z.union([z.string(), z.number()]).optional().nullable(),
  fallbackFlag: z.boolean().optional(),
  paramJson: z.string().optional().nullable(),
});

export const TaskDetailsResponseSchema = ApiResponseSchema.extend({
  data: TaskDetailsDataSchema.optional(),
});
export type TaskDetailsResponse = z.infer<typeof TaskDetailsResponseSchema>;

const FileUploadDataSchema = z.object({
  fileName: z.string(),
  filePath: z.string(),
  downloadUrl: z.string(),
  fileSize: z.number(),
  mimeType: z.string(),
  uploadedAt: z.union([z.string(), z.number()]),
});

export const FileUploadResponseSchema = ApiResponseSchema.extend({
  data: FileUploadDataSchema,
});
export type FileUploadResponse = z.infer<typeof FileUploadResponseSchema>;

export function parseTaskResultPayload(
  raw: string | Record<string, unknown> | undefined | null,
): TaskResultPayload | null {
  if (!raw) return null;

  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    return TaskResultPayloadSchema.parse(parsed);
  } catch (error) {
    console.warn("Unable to parse Kie AI task result payload", error);
    return null;
  }
}
