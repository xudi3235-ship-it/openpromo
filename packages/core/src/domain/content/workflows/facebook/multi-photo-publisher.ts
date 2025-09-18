import { EntFBFeedPendingContent } from "@core/domain/content/entity";
import type {
  CoreWorkflowContext,
  CoreWorkflowStep,
} from "@core/helpers/workflow";
import { Log } from "@core/utils/log";

const log = Log.create({ namespace: "facebook-multi-photo" });

export async function publishMultiPhotoPost(
  _ctx: CoreWorkflowContext,
  step: CoreWorkflowStep,
  pendingContentID: string,
): Promise<string> {
  const postId = await step.do("create multi-photo post", async () => {
    const c = await EntFBFeedPendingContent.fromID(pendingContentID);
    const { postId } = await c.createPhotoPost();
    return postId;
  });

  log.info("published multi-photo post", { postId });
  return postId;
}
