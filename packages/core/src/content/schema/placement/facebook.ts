import { z } from "zod";
import { SharedAttachmentSpec } from "./common";
import { CreateFeedSchema } from "../../xplat/facebook/types";
// defines schema & validation logics for facebook placements,
// it'll be used in both client & server side to valiate the inputs
// eventually, this will be transformed to sdk calls to facebook graph api
// targeting creating facebook posts, reels, stories.
// this is organic for now, for ads, we handle these separately.

// 1. identity specs, e.g. pageId, adAccountId
const IdentitySpec = z.object({
  pageId: z.string().optional(),
  adAccountId: z.string().optional(),
});

// 2. post spec
const PostSpec = z.object({
  message: z.string().optional(),
  link: z.string().optional(),
  attachments: SharedAttachmentSpec.array().optional(),
  // platform specific fields
  srcCreateFeedSchema: CreateFeedSchema.optional(),
});

const ReelSpec = z.object({
  video: SharedAttachmentSpec.optional(),
  caption: z.string().optional(),
  // platform specific fields
  //   srcCreateReelSchema
});

//
export const FacebookPlacementSchema = z
  .object({
    identity: IdentitySpec,
    post: PostSpec.optional(),
    reel: ReelSpec.optional(),
  })
  .refine((t) => !!t.post || !!t.reel, {
    message: "Either post or reel must be provided",
    path: ["post", "reel"],
  });
