import type { FBFeedPlacementSpec } from "@core/schemas/content.sql";
import type z from "zod";
import type { CreateFeedParams } from "./types";

// transforms from/to publishing params and our unified specs
// TODO: it's actually more complex than this, it's not a 1:1 mapping. For videos/multiple photos, it's a stepped process, i.e. we need to create photos first, and then upload videos, and then finally use the IDs to create the feed post/reel using the video IDs.
// biome-ignore lint/complexity/noStaticOnlyClass: TODO: fix later
export class FacebookPublishTransformer {
  public static toCreateFeedParams(
    spec: z.infer<typeof FBFeedPlacementSpec>,
  ): CreateFeedParams {
    // normalize the specs into creation params
    return {
      message: spec.postSpec.message,
    } as CreateFeedParams;
  }
}
