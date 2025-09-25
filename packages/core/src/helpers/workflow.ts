import {
  WorkflowEntrypoint,
  type WorkflowEvent,
  type WorkflowStep,
  type WorkflowStepConfig,
  type WorkflowStepEvent,
  type WorkflowTimeoutDuration,
} from "cloudflare:workers";
import { Binding, type Bindings } from "@core/helpers/api-env";
import { Actor } from "./actor";

export class CoreWorkflowContext {
  constructor(
    public readonly actor: Actor.WorkspaceUser,
    public bindings: Bindings,
  ) {}
  provide<T>(fn: (ctx: CoreWorkflowContext) => Promise<T>): Promise<T> {
    return Actor.provide("workspace_user", { ...this.actor.properties }, () => {
      return Binding.provide(this.bindings, () => {
        return fn(this);
      });
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
    try {
      if (typeof arg3 === "function") {
        const config = arg2 as WorkflowStepConfig;
        const fn = arg3 as () => Promise<T>;
        return this.step.do(name, config, () => this.ctx.provide(fn));
      } else {
        const fn = arg2 as () => Promise<T>;
        return this.step.do(name, () => this.ctx.provide(fn));
      }
    } catch (e) {
      console.error(`// Workflow step "${name}" failed: ${e}`);
      throw e;
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

    const bindings = this.env;
    if (!bindings) {
      console.error("// No bindings found in workflow env");
      throw new Error("No bindings found in workflow env");
    }
    const ctx = new CoreWorkflowContext(actor, bindings);

    return this.runWithContext(ctx, event, new CoreWorkflowStep(ctx, step));
  }

  abstract runWithContext(
    ctx: CoreWorkflowContext,
    event: WorkflowEvent<WorkflowParams>,
    step: CoreWorkflowStep,
  ): Promise<unknown>;
}

export { WorkflowEvent as CoreWorkflowEvent } from "cloudflare:workers";
