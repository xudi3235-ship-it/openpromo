import { ContentPublishingStatusZod } from "@core/schemas/content.sql";
import * as z from "zod";

export const FBPlacement = {
  FB_FEED: "FB_FEED",
  FB_STORY: "FB_STORY",
  FB_REEL: "FB_REEL",
} as const;

export const IGPlacement = {
  IG_FEED: "IG_FEED",
  IG_STORY: "IG_STORY",
  IG_REEL: "IG_REEL",
} as const;

export const AllPlacement = {
  ...IGPlacement,
  ...FBPlacement,
} as const;

export type FBPlacement = (typeof FBPlacement)[keyof typeof FBPlacement];
export type IGPlacement = (typeof IGPlacement)[keyof typeof IGPlacement];
export type AllPlacement = (typeof AllPlacement)[keyof typeof AllPlacement];

/**
 * platform agnostic schemas for contents
 */
// Base attachment schema
export const BaseAttachmentSpec = z.object({
  id: z.string(),
  presignedUrl: z.string().optional(),
  s3Key: z.string().optional(),
  thumbnailUrl: z.string().optional(),
  mimeType: z.string().optional(),
  metadata: z.record(z.any(), z.any()).optional(),
  file: z
    .instanceof(File)
    .optional()
    .catch(() => undefined),
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

// Union of all attachment types
export const SharedAttachmentSpec = z.discriminatedUnion("type", [
  PhotoAttachmentSpec,
  VideoAttachmentSpec,
]);

export type SharedAttachmentSpec = z.infer<typeof SharedAttachmentSpec>;

export const SchedulingSpec = z.object({
  publishAt: z.date().optional(),
});
export type SchedulingSpec = z.infer<typeof SchedulingSpec>;
// ------------------------ Base Placement Spec ------------------------
export const BasePlacementSpec = z.object({
  placement: z.enum([...Object.values(AllPlacement)]).optional(),
  publishingStatus: ContentPublishingStatusZod.optional(),
  customized: z
    .boolean()
    .optional()
    .describe("where this spec is customized compared to base"),
  // normalized fields
  message: z.string().optional(),
  thumbnailUrl: z.string().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  identity: z
    .object({
      connectedAccountID: z.string(),
      metadata: z.record(z.any(), z.any()).optional(),
    })
    .optional(),
  attachments: SharedAttachmentSpec.array().optional(),
  schedulingSpec: SchedulingSpec.optional(),
});

export type BasePlacementSpec = z.infer<typeof BasePlacementSpec>;

// ========================= Facebook =========================

export const postSpec = z.object({
  message: z.string(),
  link: z.string().optional(),
  attachments: SharedAttachmentSpec.array().optional(),
});

// placement specifics specs
export const BaseFBPlacementSpec = BasePlacementSpec.extend({
  placement: z.enum(Object.values(FBPlacement)),
  identity: z.object({
    connectedAccountID: z.string(),
    fbPageID: z.string(),
    metadata: z.record(z.any(), z.any()).optional(),
  }),
});

export const FBFeedPlacementSpec = BaseFBPlacementSpec.extend({
  placement: z.literal(FBPlacement.FB_FEED),
  postSpec: postSpec,
});
export type FBFeedPlacementSpec = z.infer<typeof FBFeedPlacementSpec>;

// ========================= Instagram =========================
export const BaseIGPlacementSpec = BasePlacementSpec.extend({
  placement: z.enum(Object.values(IGPlacement)),
  identity: z.object({
    connectedAccountID: z.string(),
    igAccountID: z.string(),
    metadata: z.record(z.any(), z.any()).optional(),
  }),
});
export const IGFeedPlacementSpec = BaseIGPlacementSpec.extend({
  placement: z.literal(IGPlacement.IG_FEED),
  caption: z.string().optional(),
  attachments: SharedAttachmentSpec.array().optional(),
});
export type IGFeedPlacementSpec = z.infer<typeof IGFeedPlacementSpec>;
// ========================= Export =========================

export const PlacementSpec = z.discriminatedUnion("placement", [
  FBFeedPlacementSpec,
  IGFeedPlacementSpec,
]);
export type PlacementSpec = z.infer<typeof PlacementSpec>;
