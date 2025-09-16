import { EntIGFeedPendingContent } from "@core/domain/content/entity";
import type {
  CoreWorkflowContext,
  CoreWorkflowStep,
} from "@core/helpers/workflow";
import { Log } from "@core/utils/log";

const log = Log.create({ namespace: "instagram-publisher" });

export class InstagramPublisher {
  async publish(
    _ctx: CoreWorkflowContext,
    step: CoreWorkflowStep,
    pendingContentID: string,
  ) {
    const { isPhotoCarousel, isMixedCarousel, isSingleVideoReel } =
      await step.do("determine IG feed post type", async () => {
        const c = await EntIGFeedPendingContent.fromID(pendingContentID);
        return {
          isPhotoCarousel: c.isPhotoCarousel(),
          isMixedCarousel: c.isMixedCarousel(),
          isSingleVideoReel: c.isSingleVideoReel(),
        };
      });

    // only one can be true
    if (!isPhotoCarousel && !isMixedCarousel && !isSingleVideoReel)
      throw new Error("no post type matched");

    if (isPhotoCarousel) {
      await this.publishPhotoCarousel(step, pendingContentID);
      return;
    }

    if (isMixedCarousel) {
      await this.publishMixedCarousel(step, pendingContentID);
      return;
    }

    if (isSingleVideoReel) {
      await this.publishSingleVideoReel(step, pendingContentID);
      return;
    }

    throw new Error(
      `unsupported post type for IG Feed content ${pendingContentID}`,
    );
  }

  private async publishPhotoCarousel(
    step: CoreWorkflowStep,
    pendingContentID: string,
  ) {
    await step.do("create photo carousel", async () => {
      const c = await EntIGFeedPendingContent.fromID(pendingContentID);
      const { postId } = await c.createPhotoCarouselPost();
      console.log({ postId });
    });
    log.info("published photo carousel");
  }

  private async publishMixedCarousel(
    step: CoreWorkflowStep,
    pendingContentID: string,
  ) {
    // Step 1: Create all media containers
    const { containerIds, videoContainerInfo } = await step.do(
      "create mixed carousel containers",
      async () => {
        const c = await EntIGFeedPendingContent.fromID(pendingContentID);
        return await c.createMixedCarouselContainers();
      },
    );

    // Step 2: Wait for all video containers to be ready (if any)
    if (videoContainerInfo.length > 0) {
      for (const { id: containerId, index } of videoContainerInfo) {
        await this.waitForVideoContainer(
          step,
          pendingContentID,
          containerId,
          index,
        );
      }
    }

    // Step 3: Publish the final carousel
    await step.do("publish mixed carousel", async () => {
      const c = await EntIGFeedPendingContent.fromID(pendingContentID);
      const { postId } = await c.publishCarousel(containerIds);
      console.log({ postId });
    });

    log.info("published mixed carousel");
  }

  private async publishSingleVideoReel(
    step: CoreWorkflowStep,
    pendingContentID: string,
  ) {
    // Step 1: Create video container
    const { containerId } = await step.do("create reel container", async () => {
      const c = await EntIGFeedPendingContent.fromID(pendingContentID);
      return await c.createReelContainer();
    });

    // Step 2: Wait for video processing
    await this.waitForVideoContainer(step, pendingContentID, containerId, 0);

    // Step 3: Publish reel
    await step.do("publish reel", async () => {
      const c = await EntIGFeedPendingContent.fromID(pendingContentID);
      const { postId } = await c.publishReelFromContainer(containerId);
      console.log({ postId });
    });

    log.info("published single video reel");
  }

  private async waitForVideoContainer(
    step: CoreWorkflowStep,
    pendingContentID: string,
    containerId: string,
    index: number,
  ): Promise<void> {
    // Use workflow step to check status - this is durable and retryable
    const status = await step.do(
      `check video container ${containerId} status`,
      async () => {
        const c = await EntIGFeedPendingContent.fromID(pendingContentID);
        return await c.getMediaContainerStatus(containerId);
      },
    );

    if (status.status_code === "FINISHED") {
      log.info(`video container ${containerId} at index ${index} is ready`);
      return;
    }

    if (status.status_code === "ERROR" || status.status_code === "EXPIRED") {
      throw new Error(
        `Video container ${containerId} at index ${index} failed with status: ${status.status_code}`,
      );
    }

    if (status.status_code === "IN_PROGRESS") {
      // Sleep and recursively call this method - workflow will handle retry
      await step.sleep(`wait for video ${containerId} processing`, 5000);
      return await this.waitForVideoContainer(
        step,
        pendingContentID,
        containerId,
        index,
      );
    }

    throw new Error(
      `Unknown status for video container ${containerId}: ${status.status_code}`,
    );
  }
}
