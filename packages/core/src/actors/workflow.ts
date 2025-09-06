import {
  WorkflowEntrypoint,
  type WorkflowEvent,
  type WorkflowStep,
} from "cloudflare:workers";
import z from "zod";
import {
  EntPendingContent,
  PendingContentPublisher,
} from "@/domain/content/entity";
import { Log } from "@/utils/log";
import { Actor } from "../actor";
import type { Bindings } from ".";

const PublishWorkflowParams = z.object({
  actor: Actor.WorkspaceUserSchema,
  pendingContentID: z.string(),
});

export type PublishWorkflowParams = z.infer<typeof PublishWorkflowParams>;
const log = Log.create({ namespace: "workflow" });
export async function stepWithActor<T>(
  step: WorkflowStep,
  name: string,
  actor: Actor.WorkspaceUser,
  fn: () => Promise<T>,
): Promise<T> {
  return step.do(name, async () =>
    Actor.provide("workspace_user", { ...actor.properties }, fn),
  );
}

export async function stepWithPublisher<T>(
  step: WorkflowStep,
  name: string,
  actor: Actor.WorkspaceUser,
  pendingContentID: string,
  fn: (p: PendingContentPublisher) => Promise<T>,
): Promise<T> {
  return stepWithActor(step, name, actor, async () => {
    const p =
      await PendingContentPublisher.fromPendingContentID(pendingContentID);
    return fn(p);
  });
}

export class PendingContentPublishWorkflow extends WorkflowEntrypoint<
  Bindings,
  PublishWorkflowParams
> {
  // context provider helpers

  async run(event: WorkflowEvent<PublishWorkflowParams>, step: WorkflowStep) {
    console.log("// Starting workflow");
    const actor = event.payload.actor;
    const pendingContentID = event.payload.pendingContentID;

    // 0. Fetch and return minimal data (ID + key info) to minimize serialization
    const contentInfo = await stepWithActor(
      step,
      "fetch content info",
      actor,
      async () => {
        const c = await EntPendingContent.fromID(pendingContentID);
        return {
          id: c.data.id,
          scheduledTime: c.data.schedulingSpec?.scheduledPublishAt,
          isDraft: c.isDraft(),
        }; // Only pass what's needed, no full serialize
      },
    );

    log.info("got content info", { contentInfo });

    // 1. Handle scheduling/drafts (no need to deserialize here)
    if (contentInfo.scheduledTime) {
      log.info("wait until scheduled time to publish");
      const threeSec = new Date(Date.now() + 3000);
      await step.sleepUntil("sleep until time to publish", threeSec);
    } else if (contentInfo.isDraft) {
      log.info("is draft");
      await step.waitForEvent("wait for draft publish event", {
        type: "publish_draft",
      });
    }

    log.info("time to publish");

    // 2. Publisher Step 1: Validate (re-fetch publisher to avoid serialization)
    await stepWithPublisher(
      step,
      "validate publisher",
      actor,
      pendingContentID,
      async (p) => {
        const res = await p.publish(step);
        log.info("res", { res });
      },
    );

    // 3. Publisher Step 2: Execute Publish
    await stepWithPublisher(
      step,
      "execute publish",
      actor,
      pendingContentID,
      async (p) => {
        log.info("publish executed", { p });
      },
    );
  }
}
