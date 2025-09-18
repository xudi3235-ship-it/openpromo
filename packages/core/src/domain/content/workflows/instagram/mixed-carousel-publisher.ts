import { EntIGFeedPendingContent } from "@core/domain/content/entity";
import type {
  CoreWorkflowContext,
  CoreWorkflowStep,
} from "@core/helpers/workflow";
import { Log } from "@core/utils/log";
import { waitForVideoContainer } from "./common";

const log = Log.create({ namespace: "instagram-mixed-carousel" });

export async function publishMixedCarousel(
  _ctx: CoreWorkflowContext,
  step: CoreWorkflowStep,
  pendingContentID: string,
): Promise<string> {
  const { containerIds, videoContainerInfo } = await step.do(
    "create mixed carousel containers",
    async () => {
      const c = await EntIGFeedPendingContent.fromID(pendingContentID);
      return await c.createMixedCarouselContainers();
    },
  );

  if (videoContainerInfo.length > 0) {
    for (const { id: containerId, index } of videoContainerInfo) {
      await waitForVideoContainer(step, pendingContentID, containerId, index);
    }
  }

  const postId = await step.do("publish mixed carousel", async () => {
    const c = await EntIGFeedPendingContent.fromID(pendingContentID);
    const { postId } = await c.publishCarousel(containerIds);
    return postId;
  });

  log.info("published mixed carousel", { postId });
  return postId;
}
