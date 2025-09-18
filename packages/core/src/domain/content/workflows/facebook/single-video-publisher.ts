import { EntFBFeedPendingContent } from "@core/domain/content/entity";
import type {
  CoreWorkflowContext,
  CoreWorkflowStep,
} from "@core/helpers/workflow";
import { Log } from "@core/utils/log";
import { waitForVideoUpload } from "./common";

const log = Log.create({ namespace: "facebook-single-video" });

export async function publishSingleVideoPost(
  _ctx: CoreWorkflowContext,
  step: CoreWorkflowStep,
  pendingContentID: string,
): Promise<string> {
  const { videoID } = await step.do("create single video post", async () => {
    const c = await EntFBFeedPendingContent.fromID(pendingContentID);
    const { video_id: videoID, upload_url } = await c.initVideoUploadSession();
    const { success, message } =
      await c.uploadInternalVideoToSession(upload_url);
    log.info("uploaded video to FB session", { success, message });
    return { videoID };
  });

  await waitForVideoUpload(step, pendingContentID, videoID);

  const postId = await step.do("publish facebook reel", async () => {
    const c = await EntFBFeedPendingContent.fromID(pendingContentID);
    const { postId } = await c.createReel(videoID);
    return postId;
  });

  log.info("published single video post", { postId });
  return postId;
}
