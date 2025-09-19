import { EntFBFeedPendingContent } from "@core/domain/content/entity";
import type { CoreWorkflowStep } from "@core/helpers/workflow";
import { Log } from "@core/utils/log";

const log = Log.create({ namespace: "facebook-common" });

export async function waitForVideoUpload(
  step: CoreWorkflowStep,
  pendingContentID: string,
  videoID: string,
  attempt: number = 1,
): Promise<void> {
  if (attempt > 10) {
    throw new Error(
      `video ${videoID} not ready after ${attempt - 1} attempts for content ${pendingContentID}`,
    );
  }

  const isUploadComplete = await step.do(
    `check FB video ${videoID} upload status` +
      (attempt > 1 ? ` attempt ${attempt}` : ""),
    async () => {
      const c = await EntFBFeedPendingContent.fromID(pendingContentID);
      return await c.isVideoUploadComplete(videoID);
    },
  );

  if (isUploadComplete) {
    log.info("facebook video upload complete", { pendingContentID, videoID });
    return;
  }

  log.info("facebook video still processing", {
    pendingContentID,
    videoID,
    attempt,
  });

  await step.sleep("wait for facebook video processing", 60 * 1000);
  return await waitForVideoUpload(step, pendingContentID, videoID, attempt + 1);
}

export async function waitForVideoPublish(
  step: CoreWorkflowStep,
  pendingContentID: string,
  videoID: string,
  attempt: number = 1,
): Promise<void> {
  if (attempt > 10) {
    throw new Error(
      `video ${videoID} not published after ${attempt - 1} attempts for content ${pendingContentID}`,
    );
  }

  const isPublished = await step.do(
    `check FB video ${videoID} publish status` +
      (attempt > 1 ? ` attempt ${attempt}` : ""),
    async () => {
      const c = await EntFBFeedPendingContent.fromID(pendingContentID);
      return await c.isVideoPublishComplete(videoID);
    },
  );

  if (isPublished) {
    log.info("facebook video publish complete", { pendingContentID, videoID });
    return;
  }

  log.info("facebook video still publishing", {
    pendingContentID,
    videoID,
    attempt,
  });

  await step.sleep("wait for facebook video publish", 60 * 1000);
  return await waitForVideoPublish(
    step,
    pendingContentID,
    videoID,
    attempt + 1,
  );
}
