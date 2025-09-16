import { EntIGFeedPendingContent } from "@core/domain/content/entity";
import type {
  CoreWorkflowContext,
  CoreWorkflowStep,
} from "@core/helpers/workflow";
import { NotImplementedError } from "@core/utils/error";
import { Log } from "@core/utils/log";

const log = Log.create({ namespace: "instagram-publisher" });

export class InstagramPublisher {
  async publish(
    _ctx: CoreWorkflowContext,
    step: CoreWorkflowStep,
    pendingContentID: string,
  ) {
    const { isPhotoCarousel, isMixedCarousel, isSingleVideoReel } =
      await step.do("determine IG feed post type", async () => {
        const c = await EntIGFeedPendingContent.fromID(pendingContentID);
        return {
          isPhotoCarousel: c.isPhotoCarousel(),
          isMixedCarousel: c.isMixedCarousel(),
          isSingleVideoReel: c.isSingleVideoReel(),
        };
      });

    // only one can be true
    if (!isPhotoCarousel && !isMixedCarousel && !isSingleVideoReel)
      throw new Error("no post type matched");

    if (isPhotoCarousel) {
      await this.publishPhotoCarousel(step, pendingContentID);
      return;
    }

    if (isMixedCarousel) {
      throw new NotImplementedError("TODO");
    }

    if (isSingleVideoReel) {
      throw new NotImplementedError("TODO");
    }

    throw new Error(
      `unsupported post type for IG Feed content ${pendingContentID}`,
    );
  }

  private async publishPhotoCarousel(
    step: CoreWorkflowStep,
    pendingContentID: string,
  ) {
    await step.do("create photo carousel", async () => {
      const c = await EntIGFeedPendingContent.fromID(pendingContentID);
      const { postId } = await c.createPhotoCarouselPost();
      console.log({ postId });
    });
    log.info("published photo carousel");
  }
}
