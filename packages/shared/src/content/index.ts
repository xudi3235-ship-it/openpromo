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

export const TikTokPlacement = {
  TT_FEED: "TT_FEED",
} as const;

export const AllPlacement = {
  ...IGPlacement,
  ...FBPlacement,
  ...TikTokPlacement,
} as const;

export type FBPlacement = (typeof FBPlacement)[keyof typeof FBPlacement];
export type IGPlacement = (typeof IGPlacement)[keyof typeof IGPlacement];
export type TikTokPlacement =
  (typeof TikTokPlacement)[keyof typeof TikTokPlacement];
export type AllPlacement = (typeof AllPlacement)[keyof typeof AllPlacement];

export const AllPlacementZod = z.enum([...Object.values(AllPlacement)]);

export const ContentPublishingStatus = {
  DRAFT: "DRAFT",
  SCHEDULED: "SCHEDULED",
  PUBLISHED: "PUBLISHED",
  FAILED_TO_PUBLISH: "FAILED_TO_PUBLISH",
  PUBLISH_NOW: "PUBLISH_NOW",
} as const;

export type ContentPublishingStatus =
  (typeof ContentPublishingStatus)[keyof typeof ContentPublishingStatus];

export const ContentPublishingStatusZod = z.enum([
  ...Object.values(ContentPublishingStatus),
]);

export const BaseAttachmentSpec = z.object({
  id: z.string(),
  presignedUrl: z.string().optional().describe("download url"),
  publicUrl: z.string().optional(),
  s3Key: z.string().optional(),
  thumbnailUrl: z.string().optional(),
  mimeType: z.string().optional(),
  metadata: z.record(z.any(), z.any()).optional(),
  file: z
    .instanceof(File)
    .optional()
    .catch(() => undefined),
});

export const PhotoAttachmentSpec = BaseAttachmentSpec.extend({
  type: z.literal("photo"),
  width: z.number().optional(),
  height: z.number().optional(),
  altText: z.string().optional(),
});

export const VideoAttachmentSpec = BaseAttachmentSpec.extend({
  type: z.literal("video"),
  duration: z.number().optional(),
  thumbnail: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
});

export const SharedAttachmentSpec = z.discriminatedUnion("type", [
  PhotoAttachmentSpec,
  VideoAttachmentSpec,
]);

export type BaseAttachmentSpec = z.infer<typeof BaseAttachmentSpec>;
export type PhotoAttachmentSpec = z.infer<typeof PhotoAttachmentSpec>;
export type VideoAttachmentSpec = z.infer<typeof VideoAttachmentSpec>;
export type SharedAttachmentSpec = z.infer<typeof SharedAttachmentSpec>;

export const SchedulingSpec = z.object({
  publishAt: z.coerce.date().optional(),
});

export type SchedulingSpec = z.infer<typeof SchedulingSpec>;

export const BasePlacementSpec = z.object({
  placement: z.enum([...Object.values(AllPlacement)]).optional(),
  publishingStatus: ContentPublishingStatusZod.optional(),
  customized: z.boolean().optional(),
  message: z.string().optional(),
  thumbnailUrl: z.string().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
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
  postSpec: z.object({
    message: z.string(),
    link: z.string().optional(),
  }),
});

export type FBFeedPlacementSpec = z.infer<typeof FBFeedPlacementSpec>;

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

export const BaseTikTokPlacementSpec = BasePlacementSpec.extend({
  placement: z.enum(Object.values(TikTokPlacement)),
  identity: z.object({
    connectedAccountID: z.string(),
    tiktokUserID: z.string(),
    metadata: z.record(z.any(), z.any()).optional(),
  }),
});

export const TikTokFeedPlacementSpec = BaseTikTokPlacementSpec.extend({
  placement: z.literal(TikTokPlacement.TT_FEED),
  caption: z.string().optional(),
  attachments: SharedAttachmentSpec.array().optional(),
});

export type TikTokFeedPlacementSpec = z.infer<typeof TikTokFeedPlacementSpec>;

export const PlacementSpec = z.discriminatedUnion("placement", [
  FBFeedPlacementSpec,
  IGFeedPlacementSpec,
  TikTokFeedPlacementSpec,
]);

export type PlacementSpec = z.infer<typeof PlacementSpec>;
