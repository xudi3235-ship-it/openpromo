import { EntIGFeedPendingContent } from "@core/domain/content/entity";
import type {
  CoreWorkflowContext,
  CoreWorkflowStep,
} from "@core/helpers/workflow";
import { WorkflowError } from "@core/utils/error";
import { Log } from "@core/utils/log";
import { BasePublisher } from "./base-publisher";

const log = Log.create({ namespace: "instagram-publisher" });
export class InstagramPublisher extends BasePublisher {
  async publish(
    _ctx: CoreWorkflowContext,
    step: CoreWorkflowStep,
    pendingContentID: string,
  ) {
    console.log("// Starting IG Feed publish");
    // Step 0: Prepare videos if needed (ensure downloads are ready and URLs are set)
    await this.prepareVideosIfNeeded(step, pendingContentID);

    const {
      isPhotoCarousel,
      isMixedCarousel,
      isSingleVideoReel,
      isSinglePhoto,
    } = await step.do("determine IG feed post type", async () => {
      const c = await EntIGFeedPendingContent.fromID(pendingContentID);
      return {
        isPhotoCarousel: c.isPhotoCarousel(),
        isMixedCarousel: c.isMixedCarousel(),
        isSingleVideoReel: c.isSingleVideoReel(),
        isSinglePhoto: c.isSinglePhoto(),
      };
    });

    // only one can be true
    if (
      !isPhotoCarousel &&
      !isMixedCarousel &&
      !isSingleVideoReel &&
      !isSinglePhoto
    ) {
      throw new WorkflowError("no post type matched");
    }
    if (isSinglePhoto) {
      console.log("// publishing single photo");
      // same as photo carousel
      await this.publishSinglePhoto(step, pendingContentID);
      return;
    }

    if (isPhotoCarousel) {
      console.log("// publishing photo carousel");
      await this.publishPhotoCarousel(step, pendingContentID);
      return;
    }

    if (isMixedCarousel) {
      console.log("// publishing mixed carousel");
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
  private async publishSinglePhoto(
    step: CoreWorkflowStep,
    pendingContentID: string,
  ) {
    await step.do("create single photo post", async () => {
      const c = await EntIGFeedPendingContent.fromID(pendingContentID);
      const { postId } = await c.createSinglePhotoPost();
      console.log({ postId });
    });
    log.info("published single photo");
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
      console.log("// creating reel container");
      const c = await EntIGFeedPendingContent.fromID(pendingContentID);
      console.log("// creating reel container - got pending content", { c });
      return await c.createReelContainer();
    });
    console.log("// created reel container", { containerId });

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
    attempt: number = 1,
  ): Promise<void> {
    if (attempt > 10) {
      // polled for 10 times, give up.
      throw new Error(
        `Video container ${containerId} at index ${index} not ready after ${attempt} attempts, giving up`,
      );
    }
    // Use workflow step to check status - this is durable and retryable
    const status = await step.do(
      `check video container ${containerId} status`,
      async () => {
        const c = await EntIGFeedPendingContent.fromID(pendingContentID);
        return await c.getMediaContainerStatus(containerId);
      },
    );
    console.log("// video container status", { containerId, status });

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
      await step.sleep(`wait for video ${containerId} processing`, 60 * 1000);
      return await this.waitForVideoContainer(
        step,
        pendingContentID,
        containerId,
        index,
        attempt + 1,
      );
    }

    throw new Error(
      `Unknown status for video container ${containerId}: ${status.status_code}`,
    );
  }
}
