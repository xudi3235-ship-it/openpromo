import z from "zod";
import {
  FBFeedPlacementSpec,
  FBPlacement,
  FBReelPlacementSpec,
} from "./facebook";
import { IGPlacement, IGPlacementSpec } from "./instagram";

// organic placements
export const AllPlacement = {
  ...IGPlacement,
  ...FBPlacement,
} as const;

export type AllPlacement = (typeof AllPlacement)[keyof typeof AllPlacement];

export const PlacementSpecMapping = z.object({
  // FB placements
  FB_FEED: FBFeedPlacementSpec.optional(),
  FB_REEL: FBReelPlacementSpec.optional(),
  // IG placements
  IG_FEED: IGPlacementSpec.optional(),
  IG_REEL: IGPlacementSpec.optional(),
});

export type PlacementSpecMapping = z.infer<typeof PlacementSpecMapping>;

export const PlacementSpec = z.discriminatedUnion("placement", [
  FBFeedPlacementSpec,
  FBReelPlacementSpec,
  IGPlacementSpec,
]);
export type PlacementSpec = z.infer<typeof PlacementSpec>;
