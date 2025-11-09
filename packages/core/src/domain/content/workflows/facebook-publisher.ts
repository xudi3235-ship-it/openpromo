import { EntFBFeedPendingContent } from "@core/domain/content/entity";
import type {
  CoreWorkflowContext,
  CoreWorkflowStep,
} from "@core/helpers/workflow";
import { WorkflowError } from "@core/utils/error";
import { Log } from "@core/utils/log";
import { BasePublisher } from "./base-publisher";
import { publishCarouselPost } from "./facebook/carousel-publisher";
import { publishMultiPhotoPost } from "./facebook/multi-photo-publisher";
import { determineFacebookPostType } from "./facebook/post-type";
import { publishSingleVideoPost } from "./facebook/single-video-publisher";
import { publishTextPost } from "./facebook/text-post-publisher";

const log = Log.create({ namespace: "facebook-publisher" });

export class FacebookPublisher extends BasePublisher {
  async publish(
    ctx: CoreWorkflowContext,
    step: CoreWorkflowStep,
    pendingContentID: string,
  ) {
    await this.prepareVideosIfNeeded(step, pendingContentID);

    const postType = await determineFacebookPostType(step, pendingContentID);

    const postId = await step.do(`publish ${postType} post`, async () => {
      switch (postType) {
        case "text":
          return await publishTextPost(ctx, step, pendingContentID);
        case "multiPhoto":
          return await publishMultiPhotoPost(ctx, step, pendingContentID);
        case "singleVideo":
          return await publishSingleVideoPost(ctx, step, pendingContentID);
        case "carousel":
          return await publishCarouselPost(ctx, step, pendingContentID);
        default:
          throw new WorkflowError(
            `no Facebook publisher registered for type ${postType} (${pendingContentID})`,
          );
      }
    });

    if (!postId) {
      throw new WorkflowError(
        `no postId returned after publishing Facebook content ${pendingContentID}`,
      );
    }

    if (postType !== "text") {
      await step.do("sync facebook attachments", async () => {
        const c = await EntFBFeedPendingContent.fromID(pendingContentID);
        await c.syncAttachmentsFromFacebook(postId);
      });
    }

    await step.do("mark facebook content as published", async () => {
      const c = await EntFBFeedPendingContent.fromID(pendingContentID);
      const permalinkUrl = await c.fetchPermalinkUrl(postId);
      await c.markAsPublished(postId, {
        permalinkUrl: permalinkUrl ?? undefined,
        shareUrl: permalinkUrl ?? undefined,
      });
    });

    await step.do("post facebook first comment", async () => {
      const c = await EntFBFeedPendingContent.fromID(pendingContentID);
      await c.postFirstComment(postId);
    });

    log.info("Facebook content published", { postId, postType });
  }
}
