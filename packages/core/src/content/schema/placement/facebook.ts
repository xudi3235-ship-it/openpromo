import { z } from "zod";
import { SharedAttachmentSpec, VideoAttachmentSpec } from "./common";
import {
  CreateFBReelSchema,
  CreateFeedSchema,
} from "../../xplat/facebook/types";
// defines schema & validation logics for facebook placements,
// it'll be used in both client & server side to valiate the inputs
// eventually, this will be transformed to sdk calls to facebook graph api
// targeting creating facebook posts, reels, stories.
// this is organic for now, for ads, we handle these separately.

// 1. identity specs, e.g. pageId, adAccountId
const identitySpec = z.object({
  pageId: z.string(),
  adAccountId: z.string().optional(),
});

// 2. post spec
const postSpec = z.object({
  message: z.string().optional(),
  link: z.string().optional(),
  attachments: SharedAttachmentSpec.array().optional(),
  // internal
  _createFeedSchema: CreateFeedSchema.optional(),
});

// 3. reel spec
const reelSpec = z.object({
  video: VideoAttachmentSpec.optional(),
  caption: z.string().optional(),
  // internal
  _createReelSchema: CreateFBReelSchema.optional(),
});

//
export const FacebookPlacementSchema = z
  .object({
    identity: identitySpec,
    postSpec: postSpec.optional(),
    reelSpec: reelSpec.optional(),
  })
  .refine((t) => !!t.postSpec || !!t.reelSpec, {
    message: "Either post or reel must be provided",
    path: ["post", "reel"],
  });
