import {
  DurableObject,
  WorkflowEntrypoint,
  type WorkflowEvent,
  type WorkflowStep,
} from "cloudflare:workers";
import type { User } from "@workos-inc/node";
import type { Actor } from "../actor";
import type { OrganizationRole } from "../workspace/auth";

export type ApiEnv = {
  Variables: {
    user: User | undefined;
    organizationId: string | undefined;
    role: OrganizationRole | undefined;
  };
  Bindings: {
    HYPERDRIVE: Hyperdrive;
    WORKFLOW: Workflow;
    Scheduler: DurableObjectNamespace<Scheduler>;
  };
};

type Bindings = ApiEnv["Bindings"];

type ContentPublishJob = {
  unifiedContentID: string;
  pendingContentGroupID: string;
  metadata: {
    actor: Actor.WorkspaceUser;
  };
  status: "scheduled" | "pending" | "failed";
  attempts: number;
  lastAttemptedAt: number | null;
  nextRetryAt: number | null;
};

export class Scheduler extends DurableObject<Bindings> {
  constructor(ctx: DurableObjectState, env: Bindings) {
    super(ctx, env);
    // ctx.blockConcurrencyWhile(async () => {});
  }
  async sayHello(): Promise<string> {
    const result = this.ctx.storage.sql
      .exec("SELECT 'hello from Durable Object!' as greeting")
      .one();
    return result.greeting as string;
  }
  async schedule(): Promise<string> {
    this.ctx.storage.setAlarm(Date.now() + 3 * 1000); // 3 seconds from now
    return "scheduled";
  }
  async scheduleContent(
    job: Omit<
      ContentPublishJob,
      "status" | "attempts" | "lastAttemptedAt" | "nextRetryAt"
    >,
  ) {
    const now = Date.now();
    const contentJob: ContentPublishJob = {
      ...job,
      status: "scheduled",
      attempts: 0,
      lastAttemptedAt: null,
      nextRetryAt: now + 30 * 1000, // first retry in 30 seconds
    };
    const { properties: workspaceCtx } = job.metadata.actor;
    const key = `content:${workspaceCtx.workspaceID}:${job.unifiedContentID}`;
    await this.ctx.storage.put<ContentPublishJob>(key, contentJob, {
      allowConcurrency: false,
    });
  }
  async alarm() {
    // 1. start clock
    const now = Date.now();
    // 2. get the publish jobs from kv
    const contents = await this.ctx.storage.list<ContentPublishJob>({
      prefix: "content:",
    });
    let nextRetryTime: number | null = null;

    const opts = {
      allowConcurrency: false, // avoid race condition for each publishing job
    };
    for (const [key, content] of contents) {
      // need to retry for this post
      if (content.nextRetryAt && content.nextRetryAt > now) {
        nextRetryTime = Math.min(
          nextRetryTime ?? Infinity,
          content.nextRetryAt,
        );
        continue;
      }
      if (content.attempts >= 3) {
        // mark as failed
        await this.ctx.storage.put<ContentPublishJob>(
          key,
          {
            ...content,
            lastAttemptedAt: now,
            status: "failed",
            nextRetryAt: null,
          },
          opts,
        );
      }
      // 3. attempt publish, use publishers here
      try {
        await this.ctx.storage.put<ContentPublishJob>(
          key,
          {
            ...content,
            lastAttemptedAt: now,
            status: "pending",
            nextRetryAt: Date.now() + 1000,
          },
          opts,
        );
        const success = this.publish();
        if (!success) {
          throw new Error("publish failed");
        }
        // success
        await this.ctx.storage.delete(key, opts);
      } catch (e) {
        console.error("publish error", e);
        content.attempts += 1;
        content.lastAttemptedAt = now;
        content.nextRetryAt = now + this.calculateBackoff(content.attempts);
        content.status = "failed";
        nextRetryTime = Math.min(
          nextRetryTime ?? Infinity,
          content.nextRetryAt ?? Infinity,
        );
        await this.ctx.storage.put<ContentPublishJob>(key, content, opts);
      }
      // 4. schedule next retry if needed
      if (nextRetryTime) {
        this.ctx.storage.setAlarm(nextRetryTime);
      }
    }
  }
  private publish(): boolean {
    // TODO: implement publisher
    return true;
  }

  private calculateBackoff(attempts: number) {
    return Math.min(2 ** attempts * 1000, 3600000); // cap at 1 hour
  }
}

export class PendingContentPublishWorkflow extends WorkflowEntrypoint<
  Bindings,
  Params
> {
  async run(event: WorkflowEvent<Params>, step: WorkflowStep) {
    // Steps here
    console.log("Running cloudflare workflow");
    console.log({ event, step });
  }
}
