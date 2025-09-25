import { EntTikTokFeedPendingContent } from "@core/domain/content/entity";
import type {
  CoreWorkflowContext,
  CoreWorkflowStep,
} from "@core/helpers/workflow";
import { WorkflowError } from "@core/utils/error";
import { Log } from "@core/utils/log";

const log = Log.create({ namespace: "tiktok-single-video" });

/**
 * https://developers.tiktok.com/doc/content-posting-api-get-started
 *
 * use direct post api
 */
export async function publishTikTokFeedVideo(
  _ctx: CoreWorkflowContext,
  step: CoreWorkflowStep,
  pendingContentID: string,
): Promise<string> {
  const content = await step.do("load tiktok pending content", async () => {
    const c = await EntTikTokFeedPendingContent.fromID(pendingContentID);
    c.assertReadyForPublishing();
    return c;
  });

  const videoAttachment = content.ensureSingleVideoAttachment();
  if (!videoAttachment.presignedUrl) {
    throw new WorkflowError(
      `TikTok video attachment ${videoAttachment.id} missing presignedUrl`,
    );
  }

  const identity = await step.do("resolve tiktok identity", async () => {
    return await content.identity();
  });

  const verifiedVideoUrl = await step.do(
    "ensure video available on verified domain",
    async () => {
      const { url } = await content.ensureVideoAvailableOnVerifiedDomain({
        id: videoAttachment.id,
        presignedUrl: videoAttachment.presignedUrl as string,
        mimeType: videoAttachment.mimeType,
      });
      return url;
    },
  );

  await step.do("query tiktok creator info", async () => {
    const info = await content.queryCreatorInfo(identity);
    console.log("tiktok creator info", info);
  });

  log.info("prepared TikTok publish context", {
    ...content.logContext(),
    caption: content.caption(),
    attachmentId: videoAttachment.id,
    verifiedVideoUrl,
  });

  const { publishId } = await step.do("init tiktok video publish", async () => {
    return await content.initDirectPostFromUrl(identity, {
      videoUrl: verifiedVideoUrl,
      caption: content.caption(),
      mimeType: videoAttachment.mimeType,
    });
  });

  const postId = await step.do("wait for tiktok publish status", async () => {
    const maxAttempts = 20;
    let attempt = 0;
    while (attempt < maxAttempts) {
      attempt += 1;
      const status = await content.fetchPublishStatus(identity, publishId);

      log.info("tiktok publish status", {
        publishId,
        status: status.status,
        postId: status.postId,
        attempt,
      });

      if (status.status === "PUBLISH_SUCCESS" && status.postId) {
        return status.postId;
      }

      if (
        status.status === "PUBLISH_FAIL" ||
        status.status === "PUBLISH_FAILED" ||
        status.status === "FAIL"
      ) {
        const reason = status.failReason || status.message || "unknown";
        throw new WorkflowError(
          `TikTok publish failed for ${publishId}: ${reason}`,
        );
      }

      await step.sleep(
        `wait for tiktok publish status (attempt ${attempt})`,
        Math.min(10_000, attempt * 2_000),
      );
    }

    throw new WorkflowError(
      `Timed out waiting for TikTok publish status for ${publishId}`,
    );
  });

  log.info("TikTok publish completed", { postId });
  return postId;
}
