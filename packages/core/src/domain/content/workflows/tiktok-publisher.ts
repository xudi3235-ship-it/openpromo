import { EntTikTokFeedPendingContent } from "@core/domain/content/entity";
import type { TikTokPublishStatusResult } from "@core/domain/content/entity/tiktok-feed";
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

    let publishStatus: TikTokPublishStatusResult;
    if (postType === "video") {
      await this.prepareVideosIfNeeded(step, pendingContentID);
      publishStatus = await publishTikTokFeedVideo(ctx, step, pendingContentID);
    } else if (postType === "photo") {
      publishStatus = await publishTikTokFeedPhoto(ctx, step, pendingContentID);
    } else {
      throw new WorkflowError(
        `Unsupported TikTok post type for content ${pendingContentID}: ${postType}`,
      );
    }

    const publishedPostId =
      publishStatus.post_id ??
      publishStatus.publish_id ??
      publishStatus.share_id;

    await step.do("finalize tiktok assets", async () => {
      const c = await EntTikTokFeedPendingContent.fromID(pendingContentID);
      await c.finalizeTikTokAttachments(publishStatus);
    });

    await step.do("mark tiktok content as published", async () => {
      console.log("// mark tiktok content as published");
      const c = await EntTikTokFeedPendingContent.fromID(pendingContentID);
      await c.markAsPublished(publishedPostId ?? publishStatus.publish_id, {
        permalinkUrl: publishStatus.shareUrl ?? undefined,
        shareUrl: publishStatus.shareUrl ?? undefined,
      });
    });

    log.info("TikTok content published", {
      postId: publishedPostId,
      contentId: pendingContentID,
      postType,
      shareUrl: publishStatus.shareUrl,
    });
  }
}
