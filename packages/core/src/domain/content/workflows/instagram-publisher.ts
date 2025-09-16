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
    // Step 0: Prepare videos if needed (ensure downloads are ready and URLs are set)
    await this.prepareVideosIfNeeded(step, pendingContentID);

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
    if (!isPhotoCarousel && !isMixedCarousel && !isSingleVideoReel) {
      throw new Error("no post type matched");
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

  private async prepareVideosIfNeeded(
    step: CoreWorkflowStep,
    pendingContentID: string,
  ): Promise<void> {
    // Check if content has video attachments
    const hasVideos = await step.do("check for video attachments", async () => {
      const c = await EntIGFeedPendingContent.fromID(pendingContentID);
      return c.hasVideoAttachment();
    });

    if (!hasVideos) {
      log.info("No video attachments, skipping video preparation");
      return;
    }

    // Step 1: Initiate video downloads
    const downloadStatuses = await step.do(
      "initiate video downloads",
      async () => {
        const c = await EntIGFeedPendingContent.fromID(pendingContentID);
        return await c.initiateVideoDownloads();
      },
    );

    console.log("Video download statuses:", downloadStatuses);

    // Step 2: Wait for all videos to be ready
    for (const { id: videoId, status } of downloadStatuses) {
      if (status !== "ready") {
        await this.waitForVideoDownload(step, pendingContentID, videoId);
      }
    }

    // Step 3: Get ready videos and update database
    await step.do("update video URLs in database", async () => {
      const c = await EntIGFeedPendingContent.fromID(pendingContentID);
      const readyVideos = await c.getReadyVideoDownloads();
      await c.updateVideoAttachmentsWithUrls(readyVideos);
    });

    log.info("Video preparation completed");
  }

  private async waitForVideoDownload(
    step: CoreWorkflowStep,
    pendingContentID: string,
    videoId: string,
  ): Promise<void> {
    const status = await step.do(
      `check video download ${videoId} status`,
      async () => {
        const c = await EntIGFeedPendingContent.fromID(pendingContentID);
        return await c.checkVideoDownloadStatus(videoId);
      },
    );

    if (status.status === "ready") {
      log.info(`Video download ${videoId} is ready`);
      return;
    }

    if (status.status === "error") {
      throw new Error(`Video download ${videoId} failed`);
    }

    if (status.status === "inprogress") {
      // Sleep and recursively call this method - workflow will handle retry
      await step.sleep(`wait for video ${videoId} download`, 5000);
      return await this.waitForVideoDownload(step, pendingContentID, videoId);
    }

    throw new Error(
      `Unknown video download status for ${videoId}: ${status.status}`,
    );
  }
}
