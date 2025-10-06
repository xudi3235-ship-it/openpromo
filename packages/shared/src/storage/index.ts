import * as z from "zod";

// Single file upload
export const createUploadUrlSchema = z.object({
  key: z.string().min(1),
  contentType: z.string().optional(),
  expiresIn: z.number().optional().default(3600),
  metadata: z.record(z.string(), z.string()).optional(),
  acl: z.enum(["private", "public-read"]).optional(),
});

export type CreateUploadUrlSchema = z.infer<typeof createUploadUrlSchema>;

// Multipart upload
export const initiateMultipartSchema = z.object({
  key: z.string().min(1),
  partCount: z.number().min(1).max(10000),
  contentType: z.string().optional(),
  expiresIn: z.number().optional().default(3600),
  metadata: z.record(z.string(), z.string()).optional(),
  acl: z.enum(["private", "public-read"]).optional(),
});

export type InitiateMultipartSchema = z.infer<typeof initiateMultipartSchema>;

export const completeMultipartSchema = z.object({
  key: z.string().min(1),
  uploadId: z.string().min(1),
  parts: z.array(
    z.object({
      ETag: z.string(),
      PartNumber: z.number(),
    }),
  ),
});

export type CompleteMultipartSchema = z.infer<typeof completeMultipartSchema>;

export const abortMultipartSchema = z.object({
  key: z.string().min(1),
  uploadId: z.string().min(1),
});

export type AbortMultipartSchema = z.infer<typeof abortMultipartSchema>;

export const getUrlSchema = z.object({
  expiresIn: z.coerce.number().optional().default(3600),
  operation: z.enum(["get", "put"]).optional().default("get"),
});

export type GetUrlSchema = z.infer<typeof getUrlSchema>;
