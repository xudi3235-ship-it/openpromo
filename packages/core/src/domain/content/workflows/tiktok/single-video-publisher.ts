import { EntTikTokFeedPendingContent } from "@core/domain/content/entity";
import type {
  CoreWorkflowContext,
  CoreWorkflowStep,
} from "@core/helpers/workflow";
import { NotImplementedError, WorkflowError } from "@core/utils/error";
import { Log } from "@core/utils/log";

const log = Log.create({ namespace: "tiktok-single-video" });

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

  const _identity = await step.do("resolve tiktok identity", async () => {
    return await content.identity();
  });

  log.info("prepared TikTok publish context", {
    ...content.logContext(),
    caption: content.caption(),
    attachmentId: videoAttachment.id,
  });

  const postId = await step.do("publish video to TikTok", async () => {
    throw new NotImplementedError();
  });

  log.info("TikTok publish completed", { postId });
  return postId;
}
