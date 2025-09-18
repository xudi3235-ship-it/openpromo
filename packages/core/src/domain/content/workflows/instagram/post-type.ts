import { EntIGFeedPendingContent } from "@core/domain/content/entity";
import type { CoreWorkflowStep } from "@core/helpers/workflow";
import { WorkflowError } from "@core/utils/error";

export type InstagramPostType =
  | "singlePhoto"
  | "photoCarousel"
  | "mixedCarousel"
  | "singleVideoReel";

export type InstagramPostTypeFlags = {
  isPhotoCarousel: boolean;
  isMixedCarousel: boolean;
  isSingleVideoReel: boolean;
  isSinglePhoto: boolean;
};

export async function determineInstagramPostType(
  step: CoreWorkflowStep,
  pendingContentID: string,
): Promise<InstagramPostType> {
  const flags = await determinePostTypeFlags(step, pendingContentID);
  const matches: Array<{ type: InstagramPostType; matched: boolean }> = [
    { type: "singlePhoto", matched: flags.isSinglePhoto },
    { type: "photoCarousel", matched: flags.isPhotoCarousel },
    { type: "mixedCarousel", matched: flags.isMixedCarousel },
    { type: "singleVideoReel", matched: flags.isSingleVideoReel },
  ];

  const matchedTypes = matches.filter((m) => m.matched).map((m) => m.type);

  if (matchedTypes.length === 0) {
    throw new WorkflowError(
      `no Instagram post type matched for content ${pendingContentID}`,
    );
  }

  if (matchedTypes.length > 1) {
    throw new WorkflowError(
      `multiple Instagram post types matched for content ${pendingContentID}: ${matchedTypes.join(", ")}`,
    );
  }

  return matchedTypes[0];
}

export async function determinePostTypeFlags(
  step: CoreWorkflowStep,
  pendingContentID: string,
): Promise<InstagramPostTypeFlags> {
  return await step.do("determine IG feed post type", async () => {
    const c = await EntIGFeedPendingContent.fromID(pendingContentID);
    return {
      isPhotoCarousel: c.isPhotoCarousel(),
      isMixedCarousel: c.isMixedCarousel(),
      isSingleVideoReel: c.isSingleVideoReel(),
      isSinglePhoto: c.isSinglePhoto(),
    };
  });
}
