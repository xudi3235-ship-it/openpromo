import { EntTikTokFeedPendingContent } from "@core/domain/content/entity";
import type {
  CoreWorkflowContext,
  CoreWorkflowStep,
} from "@core/helpers/workflow";
import { WorkflowError } from "@core/utils/error";
import { Log } from "@core/utils/log";
import { BasePublisher } from "./base-publisher";
import { publishTikTokFeedVideo } from "./tiktok/single-video-publisher";

const log = Log.create({ namespace: "tiktok-publisher" });

export class TikTokPublisher extends BasePublisher {
  async publish(
    ctx: CoreWorkflowContext,
    step: CoreWorkflowStep,
    pendingContentID: string,
  ) {
    await this.prepareVideosIfNeeded(step, pendingContentID);

    const content = await step.do("load tiktok pending content", async () => {
      return await EntTikTokFeedPendingContent.fromID(pendingContentID);
    });

    if (!content.hasVideoAttachment()) {
      throw new WorkflowError(
        `TikTok placement currently requires a video attachment (${pendingContentID})`,
      );
    }

    const postId = await publishTikTokFeedVideo(ctx, step, pendingContentID);

    await step.do("mark tiktok content as published", async () => {
      const c = await EntTikTokFeedPendingContent.fromID(pendingContentID);
      await c.markAsPublished(postId);
    });

    log.info("TikTok content published", {
      postId,
      contentId: pendingContentID,
    });
  }
}
