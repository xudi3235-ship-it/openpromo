import z from "zod";
import { ContentBaseSpec, SharedAttachmentSpec } from "./common";
import {
  FBFeedPlacementSpec,
  FBPlacement,
  FBReelPlacementSpec,
  FBStoryPlacementSpec,
} from "./facebook";
import { IGPlacement, IGPlacementSpec } from "./instagram";
import { TiktokPlacement } from "./tiktok";

// organic placements
export const AllPlacement = z.enum([
  ...IGPlacement.options,
  ...FBPlacement.options,
  ...TiktokPlacement.options,
]);

const TiktokPlacementSpec = ContentBaseSpec.extend({
  placement: TiktokPlacement,
  ttAccountID: z.string().optional(),
});

export const PlacementSpecMapping = z.object({
  // FB placements
  FB_FEED: FBFeedPlacementSpec.optional(),
  FB_STORY: FBStoryPlacementSpec.optional(),
  FB_REEL: FBReelPlacementSpec.optional(),
  // IG placements
  IG_FEED: IGPlacementSpec.optional(),
  IG_STORY: IGPlacementSpec.optional(),
  IG_REEL: IGPlacementSpec.optional(),
  // TikTok placements
  TT_FEED: TiktokPlacementSpec.optional(),
  TT_STORY: TiktokPlacementSpec.optional(),
});

export type PlacementSpecMapping = z.infer<typeof PlacementSpecMapping>;

export const PlacementSpec = z.discriminatedUnion("placement", [
  FBFeedPlacementSpec,
  FBReelPlacementSpec,
  FBStoryPlacementSpec,
  IGPlacementSpec,
  TiktokPlacementSpec,
]);
export type PlacementSpec = z.infer<typeof PlacementSpec>;
