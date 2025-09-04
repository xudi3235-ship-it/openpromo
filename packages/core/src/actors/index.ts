import { DurableObject } from "cloudflare:workers";
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
    DURABLE_OBJECT: DurableObjectNamespace<MyDurableObject>;
  };
};

export class MyDurableObject extends DurableObject<ApiEnv["Bindings"]> {
  constructor(ctx: DurableObjectState, env: ApiEnv["Bindings"]) {
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
    this.ctx.storage.setAlarm(Date.now() + 10 * 1000); // 10 seconds from now
    return "scheduled";
  }
  async alarm() {
    // will be invoked on alarm, this is core of our scheduling infra.
    console.log("Alarm fired!");
  }
}
