import type { WorkflowStepConfig } from "cloudflare:workers";
import { EntFBFeedPendingContent } from "@core/domain/content/entity";
import type {
  CoreWorkflowContext,
  CoreWorkflowStep,
} from "@core/helpers/workflow";
import { NotImplementedError } from "@core/utils/error";
import { Log } from "@core/utils/log";

const CONFIG = {
  retries: {
    limit: 0,
    delay: 5000,
  },
} satisfies WorkflowStepConfig;

const log = Log.create({ namespace: "facebook-publisher" });

export class FacebookPublisher {
  async publish(
    ctx: CoreWorkflowContext,
    step: CoreWorkflowStep,
    pendingContentID: string,
  ) {
    console.log("before determine post type", ctx);

    const { isCarousel, isMultiPhoto, isSingleVideo, isTextOnly } =
      await step.do("determine post type", async () => {
        const c = await EntFBFeedPendingContent.fromID(pendingContentID);
        return {
          isTextOnly: c.isTextOnlyPost(),
          isCarousel: c.isCarouselPost(),
          isMultiPhoto: c.isMultiPhotoPost(),
          isSingleVideo: c.isSingleVideoPost(),
        };
      });

    if (isTextOnly) {
      await this.publishTextPost(step, pendingContentID);
      return;
    }

    if (isMultiPhoto) {
      await this.publishMultiPhotoPost(step, pendingContentID);
      return;
    }

    if (isSingleVideo) {
      await this.publishSingleVideoPost(step, pendingContentID);
      return;
    }

    if (isCarousel) {
      throw new NotImplementedError("TODO");
    }

    throw new Error(
      `unsupported post type for FB Feed content ${pendingContentID}`,
    );
  }

  private async publishTextPost(
    step: CoreWorkflowStep,
    pendingContentID: string,
  ) {
    console.log("publish text post");
    await step.do("create text post", CONFIG, async () => {
      const c = await EntFBFeedPendingContent.fromID(pendingContentID);
      const nc = await c.createTextPost();
      console.log({ nc });
    });
    log.info("published text post");
  }

  private async publishMultiPhotoPost(
    step: CoreWorkflowStep,
    pendingContentID: string,
  ) {
    await step.do("create multi-photo post", async () => {
      const c = await EntFBFeedPendingContent.fromID(pendingContentID);
      const nc = await c.createPhotoPost();
      console.log({ nc });
    });
    log.info("published multi-photo post");
  }

  private async publishSingleVideoPost(
    step: CoreWorkflowStep,
    pendingContentID: string,
  ) {
    log.info("publish single video post");

    const { videoID } = await step.do("create single video post", async () => {
      const c = await EntFBFeedPendingContent.fromID(pendingContentID);
      const { video_id: videoID, upload_url } =
        await c.initVideoUploadSession();
      const { success, message } =
        await c.uploadInternalVideoToSession(upload_url);
      log.info("uploaded video to FB upload session", { success, message });
      return {
        videoID,
        uploadSuccess: success,
        uploadMessage: message,
      };
    });

    const { videoID: uploadCompleteVideoID } = await step.do(
      "wait for video upload",
      async () => {
        let attempts = 5;
        const thirtySeconds = 30 * 1000;
        const c = await EntFBFeedPendingContent.fromID(pendingContentID);
        const isComplete = await c.isVideoUploadComplete(videoID);
        while (!isComplete && attempts > 0) {
          log.info("video processing not done, wait 30s and retry", {
            attemptsLeft: attempts,
          });
          await new Promise((r) => setTimeout(r, thirtySeconds));
          attempts -= 1;
        }
        if (!isComplete) {
          throw new Error("video processing not done in time");
        }
        return { videoID };
      },
    );

    await step.do("create reel", async () => {
      const c = await EntFBFeedPendingContent.fromID(pendingContentID);
      const r = await c.createReel(uploadCompleteVideoID);
      console.log({ r });
    });

    log.info("published single video post");
  }
}
