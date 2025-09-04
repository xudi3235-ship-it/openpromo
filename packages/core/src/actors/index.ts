import {
  DurableObject,
  WorkflowEntrypoint,
  type WorkflowEvent,
  type WorkflowStep,
} from "cloudflare:workers";
import type { User } from "@workos-inc/node";
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

export class Scheduler extends DurableObject<Bindings> {
  constructor(ctx: DurableObjectState, env: Bindings) {
    // Required, as we're extending the base class.
    super(ctx, env);
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
  async alarm() {
    // will be invoked on alarm, this is core of our scheduling infra.
    console.log("Alarm fired!");
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
