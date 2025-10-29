import {
  AllPlacement,
  SharedAttachmentSpec as SharedAttachmentSpecSchema,
} from "@shared/content";
import { z } from "zod";

const PostPreviewMetrics = z
  .object({
    likes: z.number().nullable().optional(),
    comments: z.number().nullable().optional(),
    shares: z.number().nullable().optional(),
  })
  .optional();

const BasePreviewFields = {
  accountName: z.string().nullable().optional(),
  profilePicUrl: z.string().nullable().optional(),
  caption: z.string().nullable().optional(),
  attachments: SharedAttachmentSpecSchema.array().optional(),
  permalink: z.string().nullable().optional(),
  timestampLabel: z.string().nullable().optional(),
  metrics: PostPreviewMetrics,
} satisfies Record<string, z.ZodTypeAny>;

const InstagramFeedPreview = z.object({
  placement: z.literal(AllPlacement.IG_FEED),
  ...BasePreviewFields,
  location: z.string().nullable().optional(),
});

const InstagramReelPreview = z.object({
  placement: z.literal(AllPlacement.IG_REEL),
  ...BasePreviewFields,
  audioTitle: z.string().nullable().optional(),
});

const FacebookFeedPreview = z.object({
  placement: z.literal(AllPlacement.FB_FEED),
  ...BasePreviewFields,
  callToActionLabel: z.string().nullable().optional(),
});

const FacebookReelPreview = z.object({
  placement: z.literal(AllPlacement.FB_REEL),
  ...BasePreviewFields,
  audioTitle: z.string().nullable().optional(),
});

const TikTokFeedPreview = z.object({
  placement: z.literal(AllPlacement.TT_FEED),
  ...BasePreviewFields,
  musicTitle: z.string().nullable().optional(),
});

export const PostPreviewSchema = z.discriminatedUnion("placement", [
  InstagramFeedPreview,
  InstagramReelPreview,
  FacebookFeedPreview,
  FacebookReelPreview,
  TikTokFeedPreview,
]);

export type PostPreview = z.infer<typeof PostPreviewSchema>;
export type InstagramFeedPreview = z.infer<typeof InstagramFeedPreview>;
export type InstagramReelPreview = z.infer<typeof InstagramReelPreview>;
export type FacebookFeedPreview = z.infer<typeof FacebookFeedPreview>;
export type FacebookReelPreview = z.infer<typeof FacebookReelPreview>;
export type TikTokFeedPreview = z.infer<typeof TikTokFeedPreview>;
