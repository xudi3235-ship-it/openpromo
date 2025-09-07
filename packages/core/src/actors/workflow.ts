import {
  WorkflowEntrypoint,
  type WorkflowEvent,
  type WorkflowStep,
  type WorkflowStepConfig,
  type WorkflowStepEvent,
  type WorkflowTimeoutDuration,
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

class CoreWorkflowContext {
  constructor(public readonly actor: Actor.WorkspaceUser) {}
  provide<T>(fn: (ctx: CoreWorkflowContext) => Promise<T>): Promise<T> {
    return Actor.provide("workspace_user", { ...this.actor.properties }, () => {
      return fn(this);
    });
  }
}
export class CoreWorkflowStep {
  constructor(
    private readonly ctx: CoreWorkflowContext,
    private readonly step: WorkflowStep,
  ) {}

  async do<T extends Rpc.Serializable<T>>(
    name: string,
    fn: () => Promise<T>,
  ): Promise<T>;
  async do<T extends Rpc.Serializable<T>>(
    name: string,
    config: WorkflowStepConfig,
    callback: () => Promise<T>,
  ): Promise<T>;
  async do<T extends Rpc.Serializable<T>>(
    name: string,
    arg2: WorkflowStepConfig | (() => Promise<T>),
    arg3?: () => Promise<T> | undefined,
  ): Promise<T> {
    if (typeof arg3 === "function") {
      const config = arg2 as WorkflowStepConfig;
      const fn = arg3 as () => Promise<T>;
      return this.step.do(name, config, () => this.ctx.provide(fn));
    } else {
      const fn = arg2 as () => Promise<T>;
      return this.step.do(name, () => this.ctx.provide(fn));
    }
  }

  async sleep(name: string, duration: WorkflowSleepDuration) {
    return this.step.sleep(name, duration);
  }

  async sleepUntil(name: string, timestamp: Date | number) {
    return this.step.sleepUntil(name, timestamp);
  }

  async waitForEvent<T extends Rpc.Serializable<T>>(
    name: string,
    options: {
      type: string;
      timeout?: WorkflowTimeoutDuration | number;
    },
  ): Promise<WorkflowStepEvent<T>> {
    return this.step.waitForEvent(name, options);
  }
}

export abstract class CoreWorkflowEntrypoint<
  WorkflowParams extends Rpc.Serializable<WorkflowParams>,
> extends WorkflowEntrypoint<Bindings, WorkflowParams> {
  async run(event: WorkflowEvent<WorkflowParams>, step: WorkflowStep) {
    const { actor } = event.payload as unknown as {
      actor: Actor.WorkspaceUser;
    };

    const ctx = new CoreWorkflowContext(actor);

    return this.runWithContext(ctx, event, new CoreWorkflowStep(ctx, step));
  }

  abstract runWithContext(
    ctx: CoreWorkflowContext,
    event: WorkflowEvent<WorkflowParams>,
    step: CoreWorkflowStep,
  ): Promise<unknown>;
}

export class PendingContentPublishWorkflow extends CoreWorkflowEntrypoint<PublishWorkflowParams> {
  async runWithContext(
    _ctx: CoreWorkflowContext,
    event: WorkflowEvent<PublishWorkflowParams>,
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
