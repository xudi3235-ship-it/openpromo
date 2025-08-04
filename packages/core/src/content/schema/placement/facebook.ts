import { z } from "zod";
import {
  CreateFBReelSchema,
  CreateFeedSchema,
} from "../../infra/facebook/types";
import {
  ContentBaseSpec,
  SharedAttachmentSpec,
  VideoAttachmentSpec,
} from "./common";

// defines schema & validation logics for facebook placements,
// it'll be used in both client & server side to valiate the inputs
// eventually, this will be transformed to sdk calls to facebook graph api
// targeting creating facebook posts, reels, stories.
// this is organic for now, for ads, we handle these separately.

export const FBPlacement = z.enum(["FB_FEED", "FB_STORY", "FB_REEL"]);

// 1. identity specs, e.g. pageId, adAccountId
const identitySpec = z.object({
  pageId: z.string(),
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

// 3. reel spec
export const reelSpec = z.object({
  video: VideoAttachmentSpec.optional(),
  caption: z.string().optional(),
  // internal
  _createReelSchema: CreateFBReelSchema.optional(),
});

// placement specifics specs
export const BaseFBPlacementSpec = ContentBaseSpec.extend({
  placement: FBPlacement,
  identity: identitySpec,
});

export const FBFeedPlacementSpec = BaseFBPlacementSpec.extend({
  placement: z.literal(FBPlacement.enum.FB_FEED),
  postSpec: postSpec,
});

export const FBReelPlacementSpec = BaseFBPlacementSpec.extend({
  placement: z.literal(FBPlacement.enum.FB_REEL),
  reelSpec: reelSpec,
});

export const FBStoryPlacementSpec = BaseFBPlacementSpec.extend({
  placement: z.literal(FBPlacement.enum.FB_STORY),
});
