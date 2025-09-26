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
  console.log("// publishTikTokFeedVideo");
  await step.do("load tiktok pending content", async () => {
    const c = await EntTikTokFeedPendingContent.fromID(pendingContentID);
    c.assertReadyForPublishing();
  });

  const videoAttachment = await step.do(
    "prepare videos if needed",
    async () => {
      const c = await EntTikTokFeedPendingContent.fromID(pendingContentID);
      const videoAttachment = c.ensureSingleVideoAttachment();
      return videoAttachment;
    },
  );

  if (!videoAttachment.presignedUrl) {
    throw new WorkflowError(
      `TikTok video attachment ${videoAttachment.id} missing presignedUrl`,
    );
  }

  const identity = await step.do("resolve tiktok identity", async () => {
    const c = await EntTikTokFeedPendingContent.fromID(pendingContentID);
    return await c.identity();
  });
  console.log("resolved tiktok identity", identity);

  const verifiedVideoUrl = await step.do(
    "ensure video available on verified domain",
    async () => {
      const c = await EntTikTokFeedPendingContent.fromID(pendingContentID);
      const { url } = await c.ensureVideoAvailableOnVerifiedDomain({
        id: videoAttachment.id,
        presignedUrl: videoAttachment.presignedUrl as string,
        mimeType: videoAttachment.mimeType,
      });
      return url;
    },
  );

  await step.do("query tiktok creator info", async () => {
    const c = await EntTikTokFeedPendingContent.fromID(pendingContentID);
    const info = await c.queryCreatorInfo(identity);
    console.log("tiktok creator info", info);
  });

  const { publishId } = await step.do("init tiktok video publish", async () => {
    console.log("init tiktok video publish");
    const c = await EntTikTokFeedPendingContent.fromID(pendingContentID);
    return await c.initDirectPostFromUrl(identity, {
      videoUrl: verifiedVideoUrl,
      caption: c.caption(),
      mimeType: videoAttachment.mimeType,
      privacyLevel: "SELF_ONLY",
    });
  });

  const confirmPublishID = await step.do(
    "wait for tiktok publish status",
    async () => {
      const c = await EntTikTokFeedPendingContent.fromID(pendingContentID);
      const maxAttempts = 20;
      let attempt = 0;
      while (attempt < maxAttempts) {
        attempt += 1;
        const status = await c.fetchPublishStatus(identity, publishId);

        log.info("tiktok publish status", {
          publishId,
          status: status.status,
          attempt,
        });

        if (status.status === "PUBLISH_COMPLETE") {
          return publishId;
        }

        if (status.status === "FAILED") {
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
    },
  );

  log.info("TikTok publish completed", { confirmPublishID });
  return confirmPublishID;
}
