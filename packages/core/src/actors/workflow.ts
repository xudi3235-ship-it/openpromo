import {
  WorkflowEntrypoint,
  type WorkflowEvent,
  type WorkflowStep,
} from "cloudflare:workers";
import z from "zod";
import { Actor } from "../actor";
import {
  EntPendingContent,
  PendingContentPublisher,
} from "../domain/content/entity";
import { Log } from "../util/log";
import type { Bindings } from ".";

const PublishWorkflowParams = z.object({
  actor: Actor.WorkspaceUserSchema,
  pendingContentID: z.string(),
});

export type PublishWorkflowParams = z.infer<typeof PublishWorkflowParams>;
const log = Log.create({ namespace: "workflow" });

/**
 * publish workflow 1:1 map to a piece of content. It deals with scheduling,
 * drafts, publish now in one place. For a x-plat group with N contents, it will
 * be N workflows. Callers manage the lifecycle of the workflow.
 */
export class PendingContentPublishWorkflow extends WorkflowEntrypoint<
  Bindings,
  PublishWorkflowParams
> {
  async run(event: WorkflowEvent<PublishWorkflowParams>, step: WorkflowStep) {
    // 0. read pending content group
    const content = await step.do("read pending content", async () => {
      return EntPendingContent.fromID(event.payload.pendingContentID);
    });

    // 1. scheduled posts
    if (content.isScheduled()) {
      log.info("wait until scheduled time to publish");
      await step.sleepUntil(
        "sleep until time to publish",
        content.toScheduledContent().getScheduledAt(),
      );
    } else if (content.isDraft()) {
      // 2. draft posts, event driven
      log.info("draft post");
      await step.waitForEvent("wait for publish event", {
        type: "publish_pending_content",
      });
    }
    // 3. publish now, which can be transitioned from 1 or 2, or just publish now directly
    const publisher = await step.do("init publisher", async () => {
      return PendingContentPublisher.fromPendingContent(content);
    });
    // 3. do some work on the publisher, validate, etc.
    await publisher.publish(step);

    console.log("Running cloudflare workflow");
    console.log({ event, step });
  }
}
