import {
  WorkflowEntrypoint,
  type WorkflowEvent,
  type WorkflowStep,
} from "cloudflare:workers";
import z from "zod";
import { EntPendingContent } from "@/domain/content/entity";
import { Log } from "@/utils/log";
import { Actor } from "../actor";
import type { Bindings } from ".";

const PublishWorkflowParams = z.object({
  actor: Actor.WorkspaceUserSchema,
  pendingContentID: z.string(),
});

export type PublishWorkflowParams = z.infer<typeof PublishWorkflowParams>;
const log = Log.create({ namespace: "workflow" });

class WorkflowContext {
  private constructor(public readonly actor: Actor.WorkspaceUser) {}
  static provide<T>(
    actor: Actor.WorkspaceUser,
    fn: (ctx: WorkflowContext) => Promise<T>,
  ): Promise<T> {
    return Actor.provide("workspace_user", { ...actor.properties }, () => {
      const ctx = new WorkflowContext(actor);
      return fn(ctx);
    });
  }
}

export async function stepWithContext<T extends Rpc.Serializable<T>>(
  step: WorkflowStep,
  name: string,
  actor: Actor.WorkspaceUser,
  fn: (ctx: WorkflowContext) => Promise<T>,
): Promise<T> {
  return step.do(name, () => WorkflowContext.provide(actor, fn));
}

export class PendingContentPublishWorkflow extends WorkflowEntrypoint<
  Bindings,
  PublishWorkflowParams
> {
  async run(event: WorkflowEvent<PublishWorkflowParams>, step: WorkflowStep) {
    console.log("// Starting workflow");
    const { actor, pendingContentID } = event.payload;

    const { scheduledTime, placement, isDraft } = await stepWithContext(
      step,
      "fetch content info",
      actor,
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
  }
}
