import {
  WorkflowEntrypoint,
  type WorkflowEvent,
  type WorkflowStep,
} from "cloudflare:workers";

type Params = {
  email: string;
  metadata: Record<string, string>;
};

// this workflow is invoked when a unified content is scheduled for publishing
export class ScheduledContentWorkflow extends WorkflowEntrypoint<Env, Params> {
  async run(_event: WorkflowEvent<Params>, step: WorkflowStep) {
    // Can access bindings on `this.env`
    // Can access params on `event.payload`

    const _files = await step.do("my first step", async () => {
      // Fetch a list of files from $SOME_SERVICE
      return {
        files: [
          "doc_7392_rev3.pdf",
          "report_x29_final.pdf",
          "memo_2024_05_12.pdf",
          "file_089_update.pdf",
          "proj_alpha_v2.pdf",
          "data_analysis_q2.pdf",
          "notes_meeting_52.pdf",
          "summary_fy24_draft.pdf",
        ],
      };
    });

    const _apiResponse = await step.do("some other step", async () => {
      const resp = await fetch("https://api.cloudflare.com/client/v4/ips");
      // biome-ignore lint/suspicious/noExplicitAny: TODO: fix later
      return await resp.json<any>();
    });

    await step.sleep("wait on something", "1 minute");

    await step.do(
      "make a call to write that could maybe, just might, fail",
      // Define a retry strategy
      {
        retries: {
          limit: 5,
          delay: "5 second",
          backoff: "exponential",
        },
        timeout: "15 minutes",
      },
      async () => {
        // Do stuff here, with access to the state from our previous steps
        if (Math.random() > 0.5) {
          throw new Error("API call to $STORAGE_SYSTEM failed");
        }
      },
    );
  }
}

interface Env {
  MY_WORKFLOW: Workflow;
}

export default {
  async fetch(req: Request, env: Env) {
    // Get instanceId from query parameters
    const instanceId = new URL(req.url).searchParams.get("instanceId");

    // If an ?instanceId=<id> query parameter is provided, fetch the status
    // of an existing Workflow by its ID.
    if (instanceId) {
      const instance = await env.MY_WORKFLOW.get(instanceId);
      return Response.json({
        status: await instance.status(),
      });
    }

    // Else, create a new instance of our Workflow, passing in any (optional)
    // params and return the ID.
    const newId = await crypto.randomUUID();
    const instance = await env.MY_WORKFLOW.create({ id: newId });
    return Response.json({
      id: instance.id,
      details: await instance.status(),
    });
  },
};
