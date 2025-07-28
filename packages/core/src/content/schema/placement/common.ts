import z from "zod";

// platform agnostic stuff

// a piece of attachment, could be img, video, etc
export const SharedAttachmentSpec = z.object({
  id: z.string().optional(),
  url: z.string().optional(),
  s3Key: z.string().optional(),
  mimeType: z.string().optional(),
  metadata: z.record(z.any(), z.any()).optional(),
});
