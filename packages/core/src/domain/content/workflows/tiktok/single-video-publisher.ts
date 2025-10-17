import type { TikTokPublishStatusResult } from "@core/domain/content/entity/tiktok-feed";
import type {
  CoreWorkflowContext,
  CoreWorkflowStep,
} from "@core/helpers/workflow";
import { WorkflowError } from "@core/utils/error";
import { Log } from "@core/utils/log";
import { waitForTikTokPublishCompletion } from "./publish-status";
import { loadTikTokFeedContext } from "./tiktok-feed-service";

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
): Promise<TikTokPublishStatusResult> {
  console.log("// publishTikTokFeedVideo");
  await step.do("validate tiktok feed context", async () => {
    const { content } = await loadTikTokFeedContext(pendingContentID);
    content.assertReadyForVideoPublishing();
  });

  const identity = await step.do("resolve tiktok identity", async () => {
    const { client } = await loadTikTokFeedContext(pendingContentID);
    return client.identity;
  });

  const videoAttachment = await step.do(
    "prepare videos if needed",
    async () => {
      const { content } = await loadTikTokFeedContext(pendingContentID);
      const attachment = content.ensureSingleVideoAttachment();
      return attachment;
    },
  );

  if (!videoAttachment.presignedUrl) {
    throw new WorkflowError(
      `TikTok video attachment ${videoAttachment.id} missing presignedUrl`,
    );
  }

  console.log("resolved tiktok identity", identity);

  const verifiedVideoUrl = await step.do(
    "ensure video available on verified domain",
    async () => {
      const { content } = await loadTikTokFeedContext(pendingContentID);
      const { url } = await content.ensureVideoAvailableOnVerifiedDomain({
        id: videoAttachment.id,
        presignedUrl: videoAttachment.presignedUrl as string,
        mimeType: videoAttachment.mimeType,
      });
      return url;
    },
  );

  await step.do("query tiktok creator info", async () => {
    const { client } = await loadTikTokFeedContext(pendingContentID);
    const info = await client.queryCreatorInfo();
    console.log("tiktok creator info", info);
  });

  const { publishId } = await step.do("init tiktok video publish", async () => {
    console.log("init tiktok video publish");
    const { content, client } = await loadTikTokFeedContext(pendingContentID);
    return await content.initDirectVideoPostFromUrl(client, {
      videoUrl: verifiedVideoUrl,
      caption: content.caption(),
      mimeType: videoAttachment.mimeType,
      privacyLevel: "SELF_ONLY", // TODO: update this once app repview is done
    });
  });

  const finalStatus = await waitForTikTokPublishCompletion(
    step,
    async () => (await loadTikTokFeedContext(pendingContentID)).client,
    publishId,
  );

  log.info("TikTok publish completed", { publishId: finalStatus.publish_id });
  return finalStatus;
}
