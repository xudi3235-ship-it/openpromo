import z from "zod";
import { SharedAttachmentSpec } from "./common";

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

// organic placements
const IGPlacement = z.enum(["IG_FEED", "IG_STORY", "IG_REEL"]);
const FBPlacement = z.enum(["FB_FEED", "FB_STORY", "FB_REEL"]);
const TiktokPlacement = z.enum(["TT_FEED", "TT_STORY"]);

export const AllPlacement = z.enum([
  ...IGPlacement.options,
  ...FBPlacement.options,
  ...TiktokPlacement.options,
]);

export const ContentPublishingStatus = z.enum([
  "DRAFT",
  "SCHEDULED",
  "PUBLISHED",
  "FAILED_TO_PUBLISH",
  "ARCHIVED",
]);

// placement specifics specs
const FBPlacementSpec = ContentBaseSpec.extend({
  placement: FBPlacement,
  fbPageID: z.string().optional(),
  fbAdAccountID: z.string().optional(),
});
const IGPlacementSpec = ContentBaseSpec.extend({
  placement: IGPlacement,
  igAccountID: z.string().optional(),
  fbAdAccountID: z.string().optional(),
});
const TiktokPlacementSpec = ContentBaseSpec.extend({
  placement: TiktokPlacement,
  ttAccountID: z.string().optional(),
});

export const PlacementSpecMapping = z.object({
  // FB placements
  FB_FEED: FBPlacementSpec.optional(),
  FB_STORY: FBPlacementSpec.optional(),
  FB_REEL: FBPlacementSpec.optional(),
  // IG placements
  IG_FEED: IGPlacementSpec.optional(),
  IG_STORY: IGPlacementSpec.optional(),
  IG_REEL: IGPlacementSpec.optional(),
  // TikTok placements
  TT_FEED: TiktokPlacementSpec.optional(),
  TT_STORY: TiktokPlacementSpec.optional(),
});

export type PlacementSpecMapping = z.infer<typeof PlacementSpecMapping>;

export const PlacementSpec = z.union([
  FBPlacementSpec,
  IGPlacementSpec,
  TiktokPlacementSpec,
]);
export type PlacementSpec = z.infer<typeof PlacementSpec>;
