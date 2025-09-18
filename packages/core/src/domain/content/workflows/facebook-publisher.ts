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
import type { FacebookPostType } from "./facebook/post-type";
import { determineFacebookPostType } from "./facebook/post-type";
import { publishSingleVideoPost } from "./facebook/single-video-publisher";
import { publishTextPost } from "./facebook/text-post-publisher";

const log = Log.create({ namespace: "facebook-publisher" });

type PublisherFn = (
  ctx: CoreWorkflowContext,
  step: CoreWorkflowStep,
  pendingContentID: string,
) => Promise<string>;

const FACEBOOK_PUBLISHERS: Record<FacebookPostType, PublisherFn> = {
  text: publishTextPost,
  multiPhoto: publishMultiPhotoPost,
  singleVideo: publishSingleVideoPost,
  carousel: publishCarouselPost,
};

export class FacebookPublisher extends BasePublisher {
  async publish(
    ctx: CoreWorkflowContext,
    step: CoreWorkflowStep,
    pendingContentID: string,
  ) {
    await this.prepareVideosIfNeeded(step, pendingContentID);

    const postType = await determineFacebookPostType(step, pendingContentID);
    const publish = FACEBOOK_PUBLISHERS[postType];

    if (!publish) {
      throw new WorkflowError(
        `no Facebook publisher registered for type ${postType} (${pendingContentID})`,
      );
    }

    const postId = await publish(ctx, step, pendingContentID);

    if (!postId) {
      throw new WorkflowError(
        `no postId returned after publishing Facebook content ${pendingContentID}`,
      );
    }

    if (postType !== "text") {
      await step.do("sync facebook attachments", async () => {
        console.log("// Syncing Facebook attachments");
        const c = await EntFBFeedPendingContent.fromID(pendingContentID);
        await c.syncAttachmentsFromFacebook(postId);
        console.log("// Facebook attachments synced");
      });
    }
    await step.do("mark facebook content as published", async () => {
      const c = await EntFBFeedPendingContent.fromID(pendingContentID);
      await c.markAsPublished(postId);
      console.log("// Facebook content marked as published");
    });

    log.info("Facebook content published", { postId, postType });
  }
}
