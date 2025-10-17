import type { TikTokPublishStatusResult } from "@core/domain/content/entity/tiktok-feed";
import type {
  CoreWorkflowContext,
  CoreWorkflowStep,
} from "@core/helpers/workflow";
import { WorkflowError } from "@core/utils/error";
import { Log } from "@core/utils/log";
import { waitForTikTokPublishCompletion } from "./publish-status";
import { loadTikTokFeedContext } from "./tiktok-feed-service";

const log = Log.create({ namespace: "tiktok-photo" });

export async function publishTikTokFeedPhoto(
  _ctx: CoreWorkflowContext,
  step: CoreWorkflowStep,
  pendingContentID: string,
): Promise<TikTokPublishStatusResult> {
  await step.do("validate tiktok feed context", async () => {
    const { content } = await loadTikTokFeedContext(pendingContentID);
    content.assertReadyForPhotoPublishing();
  });

  const identity = await step.do("resolve tiktok identity", async () => {
    const { client } = await loadTikTokFeedContext(pendingContentID);
    return client.identity;
  });
  console.log("resolved tiktok identity", identity);

  const preparedPhotos = await step.do(
    "ensure photos available on verified domain",
    async () => {
      const { content } = await loadTikTokFeedContext(pendingContentID);
      return await content.ensurePhotosAvailableOnVerifiedDomain();
    },
  );

  console.log("prepared photos", preparedPhotos);

  const photoUrls = preparedPhotos.map((photo) => photo.url);
  if (photoUrls.length === 0) {
    throw new WorkflowError(
      `No prepared photo URLs found for TikTok content ${pendingContentID}`,
    );
  }

  await step.do("query tiktok creator info", async () => {
    const { client } = await loadTikTokFeedContext(pendingContentID);
    const info = await client.queryCreatorInfo();
    console.log("tiktok creator info", info);
  });

  const photoCoverIndex = 0; // TODO: allow user to select cover photo

  const { publishId } = await step.do("init tiktok photo publish", async () => {
    console.log("init tiktok photo publish");
    const { content, client } = await loadTikTokFeedContext(pendingContentID);
    return await content.initDirectPhotoPostFromUrls(client, {
      photoUrls,
      caption: content.caption(),
      privacyLevel: "SELF_ONLY",
      disableComment: false,
      autoAddMusic: true,
      allowAdvancedBoost: false,
      mentionUserIds: undefined,
      photoCoverIndex,
    });
  });

  const finalStatus = await waitForTikTokPublishCompletion(
    step,
    async () => (await loadTikTokFeedContext(pendingContentID)).client,
    publishId,
  );

  log.info("TikTok photo publish completed", {
    publishId: finalStatus.publish_id,
  });
  return finalStatus;
}
