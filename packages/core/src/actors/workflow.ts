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

/**
 * Manages dependency injection for a single workflow step.
 * It is created within a step's execution and is not serialized.
 */
class WorkflowContext {
  private constructor(public readonly actor: Actor.WorkspaceUser) {}

  /**
   * Creates and provides the context for a workflow step.
   */
  static provide<T>(
    actor: Actor.WorkspaceUser,
    fn: (ctx: WorkflowContext) => Promise<T>,
  ): Promise<T> {
    return Actor.provide("workspace_user", { ...actor.properties }, () => {
      const ctx = new WorkflowContext(actor);
      return fn(ctx);
    });
  }

  /**
   * Loads a PendingContentPublisher for the given ID.
   */
  getPublisher(pendingContentID: string): Promise<PendingContentPublisher> {
    return PendingContentPublisher.fromPendingContentID(pendingContentID);
  }
}

abstract class BaseWorkflow<TBindings, TParams> extends WorkflowEntrypoint<
  TBindings,
  TParams
> {
  /**
   * Executes a workflow step with a managed context for dependency injection.
   */
  protected stepWithContext<T extends Rpc.Serializable<T>>(
    step: WorkflowStep,
    name: string,
    actor: Actor.WorkspaceUser,
    fn: (ctx: WorkflowContext) => Promise<T>,
  ): Promise<T> {
    return step.do(name, () => WorkflowContext.provide(actor, fn));
  }
}

export class PendingContentPublishWorkflow extends BaseWorkflow<
  Bindings,
  PublishWorkflowParams
> {
  async run(event: WorkflowEvent<PublishWorkflowParams>, step: WorkflowStep) {
    console.log("// Starting workflow");
    const { actor, pendingContentID } = event.payload;

    const contentInfo = await this.stepWithContext(
      step,
      "fetch content info",
      actor,
      async () => {
        const c = await EntPendingContent.fromID(pendingContentID);
        return {
          id: c.data.id,
          scheduledTime: c.data.schedulingSpec?.scheduledPublishAt,
          isDraft: c.isDraft(),
        };
      },
    );

    log.info("got content info", { contentInfo });

    if (contentInfo.scheduledTime) {
      log.info("wait until scheduled time to publish");
      await step.sleepUntil(
        "sleep until time to publish",
        new Date(Date.now() + 3000),
      );
    } else if (contentInfo.isDraft) {
      log.info("is draft");
      await step.waitForEvent("wait for draft publish event", {
        type: "publish_draft",
      });
    }

    log.info("time to publish");

    await this.stepWithContext(
      step,
      "validate and publish",
      actor,
      async (ctx) => {
        await ctx.getPublisher(pendingContentID);
      },
    );

    await this.stepWithContext(step, "execute publish", actor, async (ctx) => {
      const publisher = await ctx.getPublisher(pendingContentID);
      log.info("publish executed", { p: publisher });
    });
  }
}
