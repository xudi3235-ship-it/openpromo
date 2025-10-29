import { z } from "zod";
import {
  AllPlacement,
  type PlacementSpec,
  SharedAttachmentSpec,
} from "./index";

const PreviewMetrics = z
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
  attachments: SharedAttachmentSpec.array().optional(),
  permalink: z.string().nullable().optional(),
  timestampLabel: z.string().nullable().optional(),
  metrics: PreviewMetrics,
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
  callToActionLabel: z.string().nullable().optional(),
});

const TikTokFeedPreview = z.object({
  placement: z.literal(AllPlacement.TT_FEED),
  ...BasePreviewFields,
  musicTitle: z.string().nullable().optional(),
});

export const ContentPreviewSchema = z.discriminatedUnion("placement", [
  InstagramFeedPreview,
  InstagramReelPreview,
  FacebookFeedPreview,
  FacebookReelPreview,
  TikTokFeedPreview,
]);

export type ContentPreview = z.infer<typeof ContentPreviewSchema>;
export type InstagramFeedPreview = z.infer<typeof InstagramFeedPreview>;
export type InstagramReelPreview = z.infer<typeof InstagramReelPreview>;
export type FacebookFeedPreview = z.infer<typeof FacebookFeedPreview>;
export type FacebookReelPreview = z.infer<typeof FacebookReelPreview>;
export type TikTokFeedPreview = z.infer<typeof TikTokFeedPreview>;

// helpers to map placement spec to content preview
export function placementSpecToContentPreview(
  spec: PlacementSpec,
): ContentPreview {
  switch (spec.placement) {
    case "IG_FEED":
      return igFeedSpecToPreview(spec);
    case "FB_FEED":
      return fbFeedSpecToPreview(spec);
    case "TT_FEED":
      return tiktokFeedSpecToPreview(spec);
  }
}

function igFeedSpecToPreview(
  spec: Extract<PlacementSpec, { placement: "IG_FEED" }>,
): InstagramFeedPreview {
  return {
    placement: spec.placement,
    accountName: null,
    profilePicUrl: null,
    caption: spec.caption ?? null,
    attachments: spec.attachments,
    permalink: null,
    timestampLabel: null,
    metrics: undefined,
    location: null,
  };
}

function fbFeedSpecToPreview(
  spec: Extract<PlacementSpec, { placement: "FB_FEED" }>,
): FacebookFeedPreview {
  return {
    placement: spec.placement,
    accountName: null,
    profilePicUrl: null,
    caption: spec.postSpec?.message ?? null,
    attachments: spec.attachments,
    permalink: null,
    timestampLabel: null,
    metrics: undefined,
    callToActionLabel: spec.postSpec?.callToAction?.type ?? null,
  };
}

function tiktokFeedSpecToPreview(
  spec: Extract<PlacementSpec, { placement: "TT_FEED" }>,
): TikTokFeedPreview {
  return {
    placement: spec.placement,
    accountName: null,
    profilePicUrl: null,
    caption: spec.caption ?? null,
    attachments: spec.attachments,
    permalink: null,
    timestampLabel: null,
    metrics: undefined,
    musicTitle: null,
  };
}
