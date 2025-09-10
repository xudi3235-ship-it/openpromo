import {
  EntFBFeedPendingContent,
  EntPendingContent,
} from "@core/domain/content/entity";
import { Actor } from "@core/helpers/actor";
import {
  type CoreWorkflowContext,
  CoreWorkflowEntrypoint,
  type CoreWorkflowEvent,
  type CoreWorkflowStep,
} from "@core/helpers/workflow";
import { NotImplementedError } from "@core/utils/error";
import { Log } from "@core/utils/log";
import z from "zod";

const PublishWorkflowParams = z.object({
  actor: Actor.WorkspaceUserSchema,
  pendingContentID: z.string(),
});

export type PublishWorkflowParams = z.infer<typeof PublishWorkflowParams>;
const log = Log.create({ namespace: "workflow" });

export class PendingContentPublishWorkflow extends CoreWorkflowEntrypoint<PublishWorkflowParams> {
  async runWithContext(
    _ctx: CoreWorkflowContext,
    event: CoreWorkflowEvent<PublishWorkflowParams>,
    step: CoreWorkflowStep,
  ) {
    console.log("// Starting workflow");
    const { pendingContentID } = event.payload;

    const { scheduledTime, placement, isDraft } = await step.do(
      "fetch content info",
      async () => {
        const c = await EntPendingContent.fromID(pendingContentID);
        return {
          id: c.data.id,
          scheduledTime: c.data.schedulingSpec?.scheduledPublishAt,
          isDraft: c.isDraft(),
          placement: c.placement(),
        };
      },
    );
    console.log({ placement });

    if (scheduledTime) {
      log.info("wait until scheduled time to publish");
      await step.sleepUntil(
        "sleep until time to publish",
        new Date(Date.now() + 3000),
      );
    } else if (isDraft) {
      log.info("is draft");
      await step.waitForEvent("wait for draft publish event", {
        type: "publish_draft",
      });
    }
    switch (placement) {
      case "FB_FEED":
        await this.handleFBFeedPublish(step, pendingContentID);
        break;
      default:
        throw new Error(`unsupported placement ${placement}`);
    }
    step.do("publish to placements", async () => {
      const actor = Actor.assert("workspace_user");
      console.log(`finally ${actor}`);
    });
  }
  async handleFBFeedPublish(step: CoreWorkflowStep, pendingContentID: string) {
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
      await step.do("create text post", async () => {
        const c = await EntFBFeedPendingContent.fromID(pendingContentID);
        const r = await c.createTextPost();
        console.log({ r });
      });
      log.info("published text post");
      return;
    }
    if (isMultiPhoto) {
      await step.do("create multi-photo post", async () => {
        // TODO: get a published post ID
        // sync it internally
        const c = await EntFBFeedPendingContent.fromID(pendingContentID);
        const r = await c.createPhotoPost();
        console.log({ r });
      });
      log.info("published multi-photo post");
      return;
    }
    if (isSingleVideo) {
      log.info("publish single video post");
      const { videoID } = await step.do(
        "create single video post",
        async () => {
          const c = await EntFBFeedPendingContent.fromID(pendingContentID);
          // 1. upload video from internal to FB
          const { video_id: videoID, upload_url } =
            await c.initVideoUploadSession();
          // 2. upload to the upload_url
          const { success, message } =
            await c.uploadInternalVideoToSession(upload_url);
          log.info("uploaded video to FB upload session", { success, message });
          return {
            videoID,
            uploadSuccess: success,
            uploadMessage: message,
          };
        },
      );
      // 3. wait for processing is done
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
      // 4. create reel with the uploaded video ID
      // reel == video post
      await step.do("create reel", async () => {
        const c = await EntFBFeedPendingContent.fromID(pendingContentID);
        // TODO: error handle here
        // sync it internally on success
        const r = await c.createReel(uploadCompleteVideoID);
        console.log({ r });
      });

      log.info("published single video post");
      return;
    }
    if (isCarousel) {
      throw new NotImplementedError("TODO");
    }
    throw new Error(
      `unsupported post type for FB Feed content ${pendingContentID}`,
    );
  }
}
