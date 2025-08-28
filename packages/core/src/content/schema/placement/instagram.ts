import z from "zod";
import { ContentBaseSpec } from "./common";

export const IGPlacement = {
  IG_FEED: "IG_FEED",
  IG_STORY: "IG_STORY",
  IG_REEL: "IG_REEL",
} as const;

export type IGPlacement = (typeof IGPlacement)[keyof typeof IGPlacement];

export const IGPlacementSpec = ContentBaseSpec.extend({
  placement: z.enum(Object.values(IGPlacement)),
  igAccountID: z.string().optional(),
  fbAdAccountID: z.string().optional(),
});

// TODO: narrow down to each specific placements
