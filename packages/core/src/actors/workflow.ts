import {
  WorkflowEntrypoint,
  type WorkflowEvent,
  type WorkflowStep,
} from "cloudflare:workers";
import type { Bindings } from ".";

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
