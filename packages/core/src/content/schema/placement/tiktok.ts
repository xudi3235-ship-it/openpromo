import z from "zod";

export const TiktokPlacement = z.enum(["TT_FEED", "TT_STORY"]);
