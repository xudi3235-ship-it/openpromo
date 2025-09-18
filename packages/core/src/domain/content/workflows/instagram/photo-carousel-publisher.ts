import { EntIGFeedPendingContent } from "@core/domain/content/entity";
import type {
  CoreWorkflowContext,
  CoreWorkflowStep,
} from "@core/helpers/workflow";
import { Log } from "@core/utils/log";

const log = Log.create({ namespace: "instagram-photo-carousel" });

export async function publishPhotoCarousel(
  _ctx: CoreWorkflowContext,
  step: CoreWorkflowStep,
  pendingContentID: string,
): Promise<string> {
  const postId = await step.do("create photo carousel", async () => {
    const c = await EntIGFeedPendingContent.fromID(pendingContentID);
    const { postId } = await c.createPhotoCarouselPost();
    return postId;
  });

  log.info("published photo carousel", { postId });
  return postId;
}
