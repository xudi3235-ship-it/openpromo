import {
  DurableObject,
  WorkflowEntrypoint,
  type WorkflowEvent,
  type WorkflowStep,
} from "cloudflare:workers";
import type { User } from "@workos-inc/node";
import { Actor } from "../actor";
import { createContext } from "../context";
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

export namespace Binding {
  export const Context = createContext<Bindings>();
  export function use(): Bindings {
    try {
      return Context.use();
    } catch {
      throw new Error("No runtime bindings found in context");
    }
  }
  export function provide<
    T extends Bindings,
    // biome-ignore lint/suspicious/noExplicitAny: TODO: fix later
    Next extends (...args: any) => any,
  >(bindings: T, fn: Next) {
    // biome-ignore lint/suspicious/noExplicitAny: TODO: fix later
    return Context.provide(bindings as any, () => fn());
  }
  export function getScheduler() {
    const { Scheduler } = use();
    const actor = Actor.assert("workspace_user");
    // each tenant uses one DO scheduler
    return Scheduler.getByName(actor.properties.organizationID);
  }
}

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
    // we're gonna implement the core publishing logics here.
    // this run is triggered from scheduler, which now uses kv
    // storage to maintain the list of pending publishing jobs.
    // per tenant.
    // ------------------------------------------------
    // the high level FSM is as follows:
    // 1. <Scheduler> trigger the workflow with job details
    // 2. workflow is multi-step, stateful serverless fn.
    // 3. it first loads the content from DB
    // 4. validates the specs, actor ctx, identity, etc.
    // 5. translate the spec to 1..N api calls to platform
    // 6. if success, mark the job as done, remove from kv from scheduler
    // 7. if fail, use DO to update it, setup retry, etc. or gave up.
    // 8. e

    console.log("Running cloudflare workflow");
    console.log({ event, step });
  }
}
