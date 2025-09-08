import type { PublishWorkflowParams } from "@core/domain/content/workflows/content-publish-workflow";
import type { OrganizationRole } from "@core/domain/workspace/auth";
import type { Scheduler } from "@core/experimental/scheduler";
import { Actor } from "@core/helpers/actor";
import { createContext } from "@core/utils/context";
import type { User } from "@workos-inc/node";

export type ApiEnv = {
  Variables: {
    user: User | undefined;
    organizationId: string | undefined;
    role: OrganizationRole | undefined;
  };
  Bindings: {
    HYPERDRIVE: Hyperdrive;
    WORKFLOW: Workflow<PublishWorkflowParams>;
    Scheduler: DurableObjectNamespace<Scheduler>;
  };
};

export type Bindings = ApiEnv["Bindings"];

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
