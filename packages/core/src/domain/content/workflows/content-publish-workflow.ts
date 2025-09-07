import z from "zod";
import { EntPendingContent } from "@/domain/content/entity";
import { Actor } from "@/helpers/actor";
import {
  type CoreWorkflowContext,
  CoreWorkflowEntrypoint,
  type CoreWorkflowEvent,
  type CoreWorkflowStep,
} from "@/helpers/workflow";
import { Log } from "@/utils/log";

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
    step.do("publish to placements", async () => {
      const actor = Actor.assert("workspace_user");
      console.log(`finally ${actor}`);
    });
  }
}
