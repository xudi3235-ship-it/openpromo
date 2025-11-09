import * as z from "zod";

export const AllPlatforms = {
  FACEBOOK: "FACEBOOK",
  INSTAGRAM: "INSTAGRAM",
  TIKTOK: "TIKTOK",
} as const;

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

export const TikTokPrivacyLevels = [
  "PUBLIC_TO_EVERYONE",
  "MUTUAL_FOLLOW_FRIENDS",
  "FOLLOWER_OF_CREATOR",
  "SELF_ONLY",
] as const;

export type TikTokPrivacyLevel = (typeof TikTokPrivacyLevels)[number];

export const TikTokPrivacyLevelZod = z.enum([...TikTokPrivacyLevels]);

export const AllPlacement = {
  ...IGPlacement,
  ...FBPlacement,
  ...TikTokPlacement,
} as const;

export type AllPlatforms = (typeof AllPlatforms)[keyof typeof AllPlatforms];

export type FBPlacement = (typeof FBPlacement)[keyof typeof FBPlacement];
export type IGPlacement = (typeof IGPlacement)[keyof typeof IGPlacement];
export type TikTokPlacement =
  (typeof TikTokPlacement)[keyof typeof TikTokPlacement];
export type AllPlacement = (typeof AllPlacement)[keyof typeof AllPlacement];

export const AllPlacementZod = z.enum([...Object.values(AllPlacement)]);

export const AllPlatformsZod = z.enum([...Object.values(AllPlatforms)]);

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
  firstComment: z
    .string()
    .trim()
    .max(2200, "First comment must be 2200 characters or fewer")
    .optional(),
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
    // Call-to-action button for link posts
    // ref: https://developers.facebook.com/docs/graph-api/reference/page/feed#page-post-call_to_action
    callToAction: z
      .object({
        type: z.enum([
          "SHOP_NOW",
          "LEARN_MORE",
          "CALL_NOW",
          "BOOK_NOW",
          "SIGN_UP",
          "CONTACT_US",
          "GET_QUOTE",
        ]),
        value: z.object({
          link: z.string().url(),
        }),
      })
      .optional(),
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

export const TikTokBusinessOptions = z.object({
  disableComment: z.boolean().optional(),
  disableDuet: z.boolean().optional(),
  disableStitch: z.boolean().optional(),
  autoAddMusic: z.boolean().optional(),
  privacyLevel: TikTokPrivacyLevelZod.optional(),
  photoCoverIndex: z.number().int().min(0).optional(),
  thumbnailOffset: z.number().int().min(0).optional(),
  customThumbnailUrl: z.string().url().optional(),
});

export type TikTokBusinessOptions = z.infer<typeof TikTokBusinessOptions>;

export const TikTokFeedPlacementSpec = BaseTikTokPlacementSpec.extend({
  placement: z.literal(TikTokPlacement.TT_FEED),
  caption: z.string().optional(),
  attachments: SharedAttachmentSpec.array().optional(),
  businessOptions: TikTokBusinessOptions.optional(),
});

export type TikTokFeedPlacementSpec = z.infer<typeof TikTokFeedPlacementSpec>;

export const PlacementSpec = z.discriminatedUnion("placement", [
  FBFeedPlacementSpec,
  IGFeedPlacementSpec,
  TikTokFeedPlacementSpec,
]);

export type PlacementSpec = z.infer<typeof PlacementSpec>;

// ----------------------------------------------------------------
// validation layer
// ----------------------------------------------------------------

function hasAttachments(spec: BasePlacementSpec) {
  return spec.attachments && spec.attachments.length > 0;
}
function hasPhoto(spec: BasePlacementSpec) {
  return spec.attachments?.some((att) => att.type === "photo");
}
function hasVideo(spec: BasePlacementSpec) {
  return spec.attachments?.some((att) => att.type === "video");
}
function hasPhotoAndVideo(spec: BasePlacementSpec) {
  return hasPhoto(spec) && hasVideo(spec);
}

export const FBFeedValidationSpec = FBFeedPlacementSpec.superRefine(
  (data, ctx) => {
    if (!hasAttachments(data)) {
      ctx.addIssue({
        code: "custom",
        message: "At least one attachment is required for FB Feed posts.",
      });
    }
    if (data.attachments && data.attachments.length > 10) {
      ctx.addIssue({
        code: "custom",
        message: "A maximum of 10 attachments are allowed for FB Feed posts.",
      });
    }
  },
);

export const IGFeedValidationSpec = IGFeedPlacementSpec.superRefine(
  (data, ctx) => {
    if (!hasAttachments(data)) {
      ctx.addIssue({
        code: "custom",
        message: "At least one attachment is required for IG Feed posts.",
      });
    }
    if (data.attachments && data.attachments.length > 10) {
      ctx.addIssue({
        code: "custom",
        message: "A maximum of 10 attachments are allowed for IG Feed posts.",
      });
    }
  },
);

export const TikTokFeedValidationSpec = TikTokFeedPlacementSpec.superRefine(
  (data, ctx) => {
    if (!hasAttachments(data)) {
      ctx.addIssue({
        code: "custom",
        message: "At least one attachment is required for TikTok posts.",
      });
    }
    if (
      data.attachments &&
      data.attachments.length > 0 &&
      data.businessOptions?.photoCoverIndex !== undefined
    ) {
      const maxIndex = data.attachments.length - 1;
      if (data.businessOptions.photoCoverIndex > maxIndex) {
        ctx.addIssue({
          code: "custom",
          path: ["businessOptions", "photoCoverIndex"],
          message: `Cover photo index must be between 0 and ${maxIndex}`,
        });
      }
    }
    if (hasPhotoAndVideo(data)) {
      ctx.addIssue({
        code: "custom",
        message:
          "Cannot have both photo and video attachments for TikTok posts.",
      });
    }
  },
);
