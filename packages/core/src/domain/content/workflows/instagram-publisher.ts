import { EntIGFeedPendingContent } from "@core/domain/content/entity";
import type {
  CoreWorkflowContext,
  CoreWorkflowStep,
} from "@core/helpers/workflow";
import { WorkflowError } from "@core/utils/error";
import { Log } from "@core/utils/log";
import { BasePublisher } from "./base-publisher";
import { publishMixedCarousel } from "./instagram/mixed-carousel-publisher";
import { publishPhotoCarousel } from "./instagram/photo-carousel-publisher";
import { determineInstagramPostType } from "./instagram/post-type";
import { publishSinglePhoto } from "./instagram/single-photo-publisher";
import { publishSingleVideoReel } from "./instagram/single-video-reel-publisher";

const log = Log.create({ namespace: "instagram-publisher" });

export class InstagramPublisher extends BasePublisher {
  async publish(
    ctx: CoreWorkflowContext,
    step: CoreWorkflowStep,
    pendingContentID: string,
  ) {
    console.log("// Starting IG Feed publish");

    await this.prepareVideosIfNeeded(step, pendingContentID);

    const postType = await determineInstagramPostType(step, pendingContentID);

    console.log(`// Determined post type: ${postType}`);

    const postId = await step.do(`publish ${postType} post`, async () => {
      switch (postType) {
        case "singlePhoto":
          return await publishSinglePhoto(ctx, step, pendingContentID);
        case "photoCarousel":
          return await publishPhotoCarousel(ctx, step, pendingContentID);
        case "mixedCarousel":
          return await publishMixedCarousel(ctx, step, pendingContentID);
        case "singleVideoReel":
          return await publishSingleVideoReel(ctx, step, pendingContentID);
        default:
          throw new WorkflowError(
            `no Instagram publisher registered for type ${postType} (${pendingContentID})`,
          );
      }
    });

    if (!postId) {
      throw new WorkflowError(
        `no postId returned after publishing Instagram content ${pendingContentID}`,
      );
    }

    await step.do("sync instagram attachments", async () => {
      log.info("syncing instagram attachments", { postId, postType });
      const c = await EntIGFeedPendingContent.fromID(pendingContentID);
      await c.syncAttachmentsFromInstagram(postId);
    });

    await step.do("mark content as published", async () => {
      log.info("marking instagram content as published", { postId, postType });
      const c = await EntIGFeedPendingContent.fromID(pendingContentID);
      const permalinkUrl = await c.fetchPermalinkUrl(postId);
      await c.markAsPublished(postId, {
        permalinkUrl: permalinkUrl ?? undefined,
        shareUrl: permalinkUrl ?? undefined,
      });
    });

    await step.do("post instagram first comment", async () => {
      const c = await EntIGFeedPendingContent.fromID(pendingContentID);
      await c.postFirstComment(postId);
    });

    log.info("Instagram content published", { postId, postType });
  }
}
