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
        const c = await EntFBFeedPendingContent.fromID(pendingContentID);
        const r = await c.createPhotoPost();
        console.log({ r });
      });
      log.info("published multi-photo post");
      return;
    }
    if (isSingleVideo) {
      throw new NotImplementedError("TODO");
    }
    if (isCarousel) {
      throw new NotImplementedError("TODO");
    }
    throw new Error(
      `unsupported post type for FB Feed content ${pendingContentID}`,
    );
  }
}
