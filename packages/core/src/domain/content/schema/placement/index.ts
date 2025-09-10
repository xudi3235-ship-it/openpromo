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

/**
 * base spec for all content placements. Platform specific children will extend
 * this and override the fields. On high level, we break down to the following
 * 1. actor context, workspace-scoped actor for this action.
 * 2. normalized fields. This is for
 */
export const BasePlacementSpec = z.object({
  placement: z.enum([...Object.values(AllPlacement)]),
  title: z.string().optional(),
  thumbnailUrl: z.string().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type BasePlacementSpec = z.infer<typeof BasePlacementSpec>;

// ========================= Facebook =========================
import { CreateFeedSchema } from "@core/experimental/infra/facebook/types";

/**
 * defines schema & validation logics for facebook placements,
 * it'll be used in both client & server side to valiate the inputs
 * eventually, this will be transformed to sdk calls to facebook graph api
 * targeting creating facebook posts, reels, stories.
 * this is organic for now, for ads, we handle these separately.
 *
 * we use this spec definitions in the front end for validation as well as preview rendering. In the backend, it's transformed into multiple api calls to eventually publish it.
 */

// 1. identity specs, e.g. pageId, adAccountId
const identitySpec = z.object({
  pageId: z.string(),
  userId: z.string(),
  adAccountId: z.string().optional(),
});

// 2. post spec
export const postSpec = z.object({
  message: z.string().optional(),
  link: z.string().optional(),
  attachments: SharedAttachmentSpec.array().optional(),
  // internal
  _createFeedSchema: CreateFeedSchema.optional(),
});

// placement specifics specs
export const BaseFBPlacementSpec = BasePlacementSpec.extend({
  placement: z.enum(Object.values(FBPlacement)),
  identity: identitySpec,
});

export const FBFeedPlacementSpec = BaseFBPlacementSpec.extend({
  placement: z.literal(FBPlacement.FB_FEED),
  postSpec: postSpec,
});
export type FBFeedPlacementSpec = z.infer<typeof FBFeedPlacementSpec>;

// ========================= Instagram =========================
export const BaseIGPlacementSpec = BasePlacementSpec.extend({
  placement: z.enum(Object.values(IGPlacement)),
  igAccountID: z.string().optional(),
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
