import type { WorkflowStepConfig } from "cloudflare:workers";
import { EntFBFeedPendingContent } from "@core/domain/content/entity";
import type {
  CoreWorkflowContext,
  CoreWorkflowStep,
} from "@core/helpers/workflow";
import { Log } from "@core/utils/log";

const log = Log.create({ namespace: "facebook-text-post" });

const STEP_CONFIG = {
  retries: {
    limit: 0,
    delay: 5000,
  },
} satisfies WorkflowStepConfig;

export async function publishTextPost(
  _ctx: CoreWorkflowContext,
  step: CoreWorkflowStep,
  pendingContentID: string,
): Promise<string> {
  const postId = await step.do("create text post", STEP_CONFIG, async () => {
    const c = await EntFBFeedPendingContent.fromID(pendingContentID);
    const { postId } = await c.createTextPost();
    return postId;
  });

  log.info("published text post", { postId });
  return postId;
}
