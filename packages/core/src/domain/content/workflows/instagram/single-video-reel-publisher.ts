import { EntIGFeedPendingContent } from "@core/domain/content/entity";
import type {
  CoreWorkflowContext,
  CoreWorkflowStep,
} from "@core/helpers/workflow";
import { Log } from "@core/utils/log";
import { waitForVideoContainer } from "./common";

const log = Log.create({ namespace: "instagram-single-video-reel" });

export async function publishSingleVideoReel(
  _ctx: CoreWorkflowContext,
  step: CoreWorkflowStep,
  pendingContentID: string,
): Promise<string> {
  const { containerId } = await step.do("create reel container", async () => {
    console.log("// creating reel container");
    const c = await EntIGFeedPendingContent.fromID(pendingContentID);
    console.log("// creating reel container - got pending content", { c });
    return await c.createReelContainer();
  });

  console.log("// created reel container", { containerId });

  await waitForVideoContainer(step, pendingContentID, containerId, 0);

  const postId = await step.do("publish reel", async () => {
    const c = await EntIGFeedPendingContent.fromID(pendingContentID);
    const { postId } = await c.publishReelFromContainer(containerId);
    return postId;
  });

  log.info("published single video reel", { postId });
  return postId;
}
