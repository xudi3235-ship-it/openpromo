import z from "zod";
import { ContentBaseSpec } from "./common";

export const IGPlacement = z.enum(["IG_FEED", "IG_STORY", "IG_REEL"]);

export const IGPlacementSpec = ContentBaseSpec.extend({
    placement: IGPlacement,
    igAccountID: z.string().optional(),
    fbAdAccountID: z.string().optional(),
});

// TODO: narrow down to each specific placements
