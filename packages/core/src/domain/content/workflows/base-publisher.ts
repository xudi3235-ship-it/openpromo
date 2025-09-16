import {
  EntIGFeedPendingContent,
  EntPendingContent,
} from "@core/domain/content/entity";
import type { CoreWorkflowStep } from "@core/helpers/workflow";
import { Log } from "@core/utils/log";

const log = Log.create({ namespace: "base-publisher" });

export abstract class BasePublisher {
  /**
   * Shared video preparation logic that can be used by any publisher
   * Ensures videos are downloaded and ready with presigned URLs
   * Works with any content type that has video attachments
   */
  protected async prepareVideosIfNeeded(
    step: CoreWorkflowStep,
    pendingContentID: string,
  ): Promise<void> {
    // Check if content has video attachments using base pending content
    const hasVideos = await step.do("check for video attachments", async () => {
      console.log("checking for video attachments");
      const c = await EntPendingContent.fromID(pendingContentID);
      // Check if there are video attachments in the placement spec
      return c.data.placementSpec?.attachments?.some((a) => a.type === "video");
    });
    console.log("has video attachments:", hasVideos);
    if (!hasVideos) {
      log.info("No video attachments, skipping video preparation");
      return;
    }
    // Step 1: Initiate video downloads
    const downloadStatuses = await step.do(
      "initiate video downloads",
      async () => {
        const c = await EntPendingContent.fromID(pendingContentID);
        return await c.initiateVideoDownloads();
      },
    );

    console.log("Video download statuses:", downloadStatuses);

    // Step 2: Wait for all videos to be ready
    for (const { id: videoId, status } of downloadStatuses) {
      console.log(`Video ${videoId} initial status: ${status}`);
      if (status !== "ready") {
        await this.waitForVideoDownload(step, pendingContentID, videoId);
      }
    }

    // Step 3: Get ready videos and update URLs
    await step.do("update video URLs", async () => {
      const c = await EntPendingContent.fromID(pendingContentID);
      const readyVideos = await c.getReadyVideoDownloads();
      console.log("updating video URLs", { readyVideos });
      const nc = await c.updateVideoAttachmentsWithUrls(readyVideos);
      console.log("Updated content after setting video URLs", { nc });
    });

    log.info("Video preparation completed", { contentId: pendingContentID });
  }

  /**
   * Shared video download polling logic
   */
  protected async waitForVideoDownload(
    step: CoreWorkflowStep,
    pendingContentID: string,
    videoId: string,
    attempt: number = 1,
  ): Promise<void> {
    if (attempt > 12) {
      // 12 attempts * 5s = 60s max wait per video
      throw new Error(
        `Video download ${videoId} not ready after ${attempt} attempts, giving up`,
      );
    }

    const status = await step.do(
      `check video download ${videoId} status (attempt ${attempt})`,
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
      return await this.waitForVideoDownload(
        step,
        pendingContentID,
        videoId,
        attempt + 1,
      );
    }

    throw new Error(
      `Unknown video download status for ${videoId}: ${status.status}`,
    );
  }
}
