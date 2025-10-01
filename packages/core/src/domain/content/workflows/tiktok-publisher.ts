import { EntTikTokFeedPendingContent } from "@core/domain/content/entity";
import type {
  CoreWorkflowContext,
  CoreWorkflowStep,
} from "@core/helpers/workflow";
import { WorkflowError } from "@core/utils/error";
import { Log } from "@core/utils/log";
import { BasePublisher } from "./base-publisher";
import { publishTikTokFeedPhoto } from "./tiktok/photo-publisher";
import { publishTikTokFeedVideo } from "./tiktok/single-video-publisher";

const log = Log.create({ namespace: "tiktok-publisher" });

export class TikTokPublisher extends BasePublisher {
  async publish(
    ctx: CoreWorkflowContext,
    step: CoreWorkflowStep,
    pendingContentID: string,
  ) {
    const postType = await step.do("determine tiktok post type", async () => {
      const c = await EntTikTokFeedPendingContent.fromID(pendingContentID);
      return c.determinePostType();
    });

    let postId: string;
    if (postType === "video") {
      await this.prepareVideosIfNeeded(step, pendingContentID);
      postId = await publishTikTokFeedVideo(ctx, step, pendingContentID);
    } else if (postType === "photo") {
      postId = await publishTikTokFeedPhoto(ctx, step, pendingContentID);
    } else {
      throw new WorkflowError(
        `Unsupported TikTok post type for content ${pendingContentID}: ${postType}`,
      );
    }

    await step.do("mark tiktok content as published", async () => {
      console.log("// mark tiktok content as published");
      const c = await EntTikTokFeedPendingContent.fromID(pendingContentID);
      await c.markAsPublished(postId);
      // TODO: since tiktok we duplicate video asset from stream -> R2, we
      // need to delete the R2 assets as well.
    });

    log.info("TikTok content published", {
      postId,
      contentId: pendingContentID,
      postType,
    });
  }
}
