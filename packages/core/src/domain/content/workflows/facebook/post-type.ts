import { EntFBFeedPendingContent } from "@core/domain/content/entity";
import type { CoreWorkflowStep } from "@core/helpers/workflow";
import { WorkflowError } from "@core/utils/error";

export type FacebookPostType =
  | "text"
  | "multiPhoto"
  | "singleVideo"
  | "carousel";

export type FacebookPostTypeFlags = {
  isTextOnly: boolean;
  isMultiPhoto: boolean;
  isSingleVideo: boolean;
  isCarousel: boolean;
};

export async function determineFacebookPostType(
  step: CoreWorkflowStep,
  pendingContentID: string,
): Promise<FacebookPostType> {
  const flags = await determineFacebookPostTypeFlags(step, pendingContentID);

  if (flags.isTextOnly) return "text";
  if (flags.isMultiPhoto && !flags.isCarousel && !flags.isSingleVideo)
    return "multiPhoto";
  if (flags.isSingleVideo && !flags.isCarousel) return "singleVideo";
  if (flags.isCarousel) return "carousel";

  throw new WorkflowError(
    `unsupported Facebook Feed post type for content ${pendingContentID}`,
  );
}

export async function determineFacebookPostTypeFlags(
  step: CoreWorkflowStep,
  pendingContentID: string,
): Promise<FacebookPostTypeFlags> {
  return await step.do("determine FB feed post type", async () => {
    const c = await EntFBFeedPendingContent.fromID(pendingContentID);
    return {
      isTextOnly: Boolean(c.isTextOnlyPost()),
      isMultiPhoto: Boolean(c.isMultiPhotoPost()),
      isSingleVideo: Boolean(c.isSingleVideoPost()),
      isCarousel: Boolean(c.isCarouselPost()),
    } satisfies FacebookPostTypeFlags;
  });
}
