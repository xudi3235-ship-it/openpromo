import z from "zod";

/**
 * platform agnostic schemas for contents
 */
// Base attachment schema
export const BaseAttachmentSpec = z.object({
  id: z.string().optional(),
  url: z.string().optional(),
  s3Key: z.string().optional(),
  thumbnailUrl: z.string().optional(),
  mimeType: z.string().optional(),
  metadata: z.record(z.any(), z.any()).optional(),
});

// Photo attachment
export const PhotoAttachmentSpec = BaseAttachmentSpec.extend({
  type: z.literal("photo"),
  width: z.number().optional(),
  height: z.number().optional(),
  altText: z.string().optional(),
});

// Video attachment
export const VideoAttachmentSpec = BaseAttachmentSpec.extend({
  type: z.literal("video"),
  duration: z.number().optional(),
  thumbnail: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
});

// Link attachment
export const LinkAttachmentSpec = BaseAttachmentSpec.extend({
  type: z.literal("link"),
  title: z.string().optional(),
  description: z.string().optional(),
  favicon: z.string().optional(),
});

// Union of all attachment types
export const SharedAttachmentSpec = z.discriminatedUnion("type", [
  PhotoAttachmentSpec,
  VideoAttachmentSpec,
  LinkAttachmentSpec,
]);

export const TimeSpec = z.object({
  createdAt: z.string().optional(),
  scheduledPublishAt: z.date().optional(),
  publishedAt: z.string().optional(),
  updatedAt: z.string().optional(),
});
// internal content spec.
// platform agnostic representation of a "post" item.
export const ContentBaseSpec = z.object({
  title: z.string().optional(),
  bodyText: z.string().optional(),
  attachments: z.array(SharedAttachmentSpec).optional(),
  metadata: z.record(z.any(), z.any()).optional(),
  timeSpec: TimeSpec.optional(),
});

export type ContentBaseSpec = z.infer<typeof ContentBaseSpec>;
