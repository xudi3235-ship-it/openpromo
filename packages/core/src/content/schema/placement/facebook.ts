import { z } from "zod";
import { CreateFeedSchema } from "../../infra/facebook/types";
import { BasePlacementSpec, SharedAttachmentSpec } from "./common";

/**
 * defines schema & validation logics for facebook placements,
 * it'll be used in both client & server side to valiate the inputs
 * eventually, this will be transformed to sdk calls to facebook graph api
 * targeting creating facebook posts, reels, stories.
 * this is organic for now, for ads, we handle these separately.
 *
 * we use this spec definitions in the front end for validation as well as preview rendering. In the backend, it's transformed into multiple api calls to eventually publish it.
 */
export const FBPlacement = {
  FB_FEED: "FB_FEED",
  FB_STORY: "FB_STORY",
  FB_REEL: "FB_REEL",
} as const;

export type FBPlacement = (typeof FBPlacement)[keyof typeof FBPlacement];

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
