import { EntPendingContent } from "@core/domain/content/entity";
import { Actor } from "@core/helpers/actor";
import {
  type CoreWorkflowContext,
  CoreWorkflowEntrypoint,
  type CoreWorkflowEvent,
  type CoreWorkflowStep,
} from "@core/helpers/workflow";
import { Log } from "@core/utils/log";
import z from "zod";
import { FacebookPublisher } from "./facebook-publisher";
import { InstagramPublisher } from "./instagram-publisher";

const PublishWorkflowParams = z.object({
  actor: Actor.WorkspaceUserSchema,
  pendingContentID: z.string(),
});

export type PublishWorkflowParams = z.infer<typeof PublishWorkflowParams>;
const log = Log.create({ namespace: "workflow" });

export class PendingContentPublishWorkflow extends CoreWorkflowEntrypoint<PublishWorkflowParams> {
  async runWithContext(
    ctx: CoreWorkflowContext,
    event: CoreWorkflowEvent<PublishWorkflowParams>,
    step: CoreWorkflowStep,
  ) {
    console.log("// Starting workflow");
    const { pendingContentID } = event.payload;

    const { scheduledTime, placement, isDraft, isPublished } = await step.do(
      "fetch content info",
      async () => {
        const c = await EntPendingContent.fromID(pendingContentID);
        return {
          id: c.data.id,
          scheduledTime: c.data.placementSpec?.schedulingSpec?.publishAt,
          isDraft: c.isDraft(),
          placement: c.placement(),
          isPublished: c.isPublished(),
        };
      },
    );
    if (isPublished) {
      log.info("content already published, skip workflow");
      return;
    }

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
      case "FB_FEED": {
        const fbPublisher = new FacebookPublisher();
        await fbPublisher.publish(ctx, step, pendingContentID);
        break;
      }
      case "IG_FEED": {
        const igPublisher = new InstagramPublisher();
        await igPublisher.publish(ctx, step, pendingContentID);
        break;
      }
      default:
        throw new Error(`unsupported placement ${placement}`);
    }
    step.do("publish to placements", async () => {
      const actor = Actor.assert("workspace_user");
      console.log(`finally ${actor}`);
    });
  }
}
