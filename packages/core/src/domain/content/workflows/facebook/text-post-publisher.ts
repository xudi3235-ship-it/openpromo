import type { WorkflowStepConfig } from "cloudflare:workers";
import type {
  CoreWorkflowContext,
  CoreWorkflowStep,
} from "@core/helpers/workflow";
import { WorkflowError } from "@core/utils/error";
import { Log } from "@core/utils/log";
import { loadFacebookFeedContext } from "./facebook-feed-service";

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
    const { content, client } = await loadFacebookFeedContext(pendingContentID);

    if (!content.isTextOnlyPost()) {
      throw new WorkflowError(
        `content ${pendingContentID} is not a text-only Facebook post`,
      );
    }

    const message = content.spec.postSpec.message?.trim();
    if (!message) {
      throw new WorkflowError(
        `content ${pendingContentID} is missing a Facebook message`,
      );
    }

    const { postId } = await client.createFeedPost({
      message,
      callToAction: content.spec.postSpec.callToAction,
    });
    return postId;
  });

  log.info("published text post", { postId });
  return postId;
}
