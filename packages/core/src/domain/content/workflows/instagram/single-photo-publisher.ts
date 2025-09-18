import { EntIGFeedPendingContent } from "@core/domain/content/entity";
import type {
  CoreWorkflowContext,
  CoreWorkflowStep,
} from "@core/helpers/workflow";
import { Log } from "@core/utils/log";

const log = Log.create({ namespace: "instagram-single-photo" });

export async function publishSinglePhoto(
  _ctx: CoreWorkflowContext,
  step: CoreWorkflowStep,
  pendingContentID: string,
): Promise<string> {
  const postId = await step.do("create single photo post", async () => {
    const c = await EntIGFeedPendingContent.fromID(pendingContentID);
    const { postId } = await c.createSinglePhotoPost();
    return postId;
  });

  log.info("published single photo", { postId });
  return postId;
}
