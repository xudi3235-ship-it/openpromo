import { EntTikTokFeedPendingContent } from "@core/domain/content/entity";
import type {
  CoreWorkflowContext,
  CoreWorkflowStep,
} from "@core/helpers/workflow";
import { WorkflowError } from "@core/utils/error";
import { Log } from "@core/utils/log";
import { waitForTikTokPublishCompletion } from "./publish-status";

const log = Log.create({ namespace: "tiktok-photo" });

export async function publishTikTokFeedPhoto(
  _ctx: CoreWorkflowContext,
  step: CoreWorkflowStep,
  pendingContentID: string,
): Promise<string> {
  await step.do("load tiktok pending content", async () => {
    const c = await EntTikTokFeedPendingContent.fromID(pendingContentID);
    c.assertReadyForPhotoPublishing();
  });

  const identity = await step.do("resolve tiktok identity", async () => {
    const c = await EntTikTokFeedPendingContent.fromID(pendingContentID);
    return await c.identity();
  });
  console.log("resolved tiktok identity", identity);

  const preparedPhotos = await step.do(
    "ensure photos available on verified domain",
    async () => {
      const c = await EntTikTokFeedPendingContent.fromID(pendingContentID);
      return await c.ensurePhotosAvailableOnVerifiedDomain();
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
    const c = await EntTikTokFeedPendingContent.fromID(pendingContentID);
    const info = await c.queryCreatorInfo(identity);
    console.log("tiktok creator info", info);
  });

  const photoCoverIndex = 0;

  const { publishId } = await step.do("init tiktok photo publish", async () => {
    console.log("init tiktok photo publish");
    const c = await EntTikTokFeedPendingContent.fromID(pendingContentID);
    return await c.initDirectPhotoPostFromUrls(identity, {
      photoUrls,
      caption: c.caption(),
      privacyLevel: "SELF_ONLY",
      disableComment: false,
      autoAddMusic: true,
      allowAdvancedBoost: false,
      mentionUserIds: undefined,
      photoCoverIndex,
    });
  });

  const confirmPublishID = await waitForTikTokPublishCompletion(
    step,
    pendingContentID,
    identity,
    publishId,
  );

  log.info("TikTok photo publish completed", { confirmPublishID });
  return confirmPublishID;
}
