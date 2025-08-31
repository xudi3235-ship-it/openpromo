import z from "zod";
import { FBFeedPlacementSpec, FBPlacement } from "./facebook";
import { IGPlacement, IGPlacementSpec } from "./instagram";

// organic placements
export const AllPlacement = {
  ...IGPlacement,
  ...FBPlacement,
} as const;

export type AllPlacement = (typeof AllPlacement)[keyof typeof AllPlacement];

export const PlacementSpec = z.discriminatedUnion("placement", [
  FBFeedPlacementSpec,
  IGPlacementSpec,
]);
export type PlacementSpec = z.infer<typeof PlacementSpec>;
