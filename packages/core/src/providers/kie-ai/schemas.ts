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

// WAN 2.5 image-to-video
export const Wan25ResolutionSchema = z.enum(["720p", "1080p"]);
export type Wan25Resolution = z.infer<typeof Wan25ResolutionSchema>;

export const Wan25DurationSchema = z.enum(["5", "10"]);
export type Wan25Duration = z.infer<typeof Wan25DurationSchema>;

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

// ===== VEO 3.1 SCHEMAS (enums only, response schemas below after ApiResponseSchema) =====

export const Veo31AspectRatioSchema = z.enum(["16:9", "9:16", "Auto"]);
export type Veo31AspectRatio = z.infer<typeof Veo31AspectRatioSchema>;

export const Veo31ModelSchema = z.enum(["veo3", "veo3_fast"]);
export type Veo31Model = z.infer<typeof Veo31ModelSchema>;

export const Veo31GenerationTypeSchema = z.enum([
  "TEXT_2_VIDEO",
  "FIRST_AND_LAST_FRAMES_2_VIDEO",
  "REFERENCE_2_VIDEO",
]);
export type Veo31GenerationType = z.infer<typeof Veo31GenerationTypeSchema>;

export const TaskResultPayloadSchema = z.object({
  resultUrls: z.array(z.string()).optional(),
  originUrls: z.array(z.string()).optional(),
});
export type TaskResultPayload = z.infer<typeof TaskResultPayloadSchema>;

export const ApiResponseSchema = z.object({
  code: z.number(),
  msg: z.string(),
  data: z.any().nullable().optional(),
  rawData: z.unknown().optional(),
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

// ===== VEO 3.1 RESPONSE SCHEMAS =====

const Veo31VideoResponseSchema = z.object({
  taskId: z.string(),
  resultUrls: z.array(z.string()).optional(),
  originUrls: z.array(z.string()).optional().nullable(),
  resolution: z.string().optional().nullable(),
});

const Veo31VideoDetailsDataSchema = z.object({
  taskId: z.string(),
  paramJson: z.string().optional().nullable(),
  completeTime: z.union([z.string(), z.number()]).optional().nullable(),
  response: Veo31VideoResponseSchema.optional().nullable(),
  successFlag: z.number(),
  errorCode: z.string().optional().nullable(),
  errorMessage: z.string().optional().nullable(),
  createTime: z.union([z.string(), z.number()]).optional().nullable(),
  fallbackFlag: z.boolean().optional(),
});

export const Veo31GenerateVideoResponseSchema = ApiResponseSchema.extend({
  data: z.object({ taskId: z.string() }).optional(),
});
export type Veo31GenerateVideoResponse = z.infer<
  typeof Veo31GenerateVideoResponseSchema
>;

export const Veo31ExtendVideoResponseSchema = ApiResponseSchema.extend({
  data: z.object({ taskId: z.string() }).optional(),
});
export type Veo31ExtendVideoResponse = z.infer<
  typeof Veo31ExtendVideoResponseSchema
>;

export const Veo31VideoDetailsResponseSchema = ApiResponseSchema.extend({
  data: Veo31VideoDetailsDataSchema.optional(),
});
export type Veo31VideoDetailsResponse = z.infer<
  typeof Veo31VideoDetailsResponseSchema
>;

export const Veo31Video1080pResponseSchema = ApiResponseSchema.extend({
  data: z.object({ resultUrl: z.string() }).optional(),
});
export type Veo31Video1080pResponse = z.infer<
  typeof Veo31Video1080pResponseSchema
>;

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
