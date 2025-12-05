import { Platform } from "@core/containers";
import { and, db, eq } from "@core/database/db";
import { EntFBFeedPendingContent } from "@core/domain/content/entity";
import { Actor } from "@core/helpers/actor";
import { Binding } from "@core/helpers/api-env";
import type {
  CoreWorkflowContext,
  CoreWorkflowStep,
} from "@core/helpers/workflow";
import { unifiedContentTable } from "@core/schemas/content.sql";
import { onlyOrThrow } from "@core/utils/common";
import { Log } from "@core/utils/log";
import { waitForVideoPublish, waitForVideoUpload } from "./common";
import { loadFacebookFeedContext } from "./facebook-feed-service";

const log = Log.create({ namespace: "facebook-single-video" });

export async function publishSingleVideoPost(
  _ctx: CoreWorkflowContext,
  step: CoreWorkflowStep,
  pendingContentID: string,
): Promise<string> {
  // 0. transcode video if needed
  await step.do("transcode FB reel if needed", async () => {
    // A. sanitize, get the download Url
    const c = await EntFBFeedPendingContent.fromID(pendingContentID);
    if (!c.isSingleVideoPost()) throw new Error("not a single video post");
    const { id, presignedUrl } = onlyOrThrow(c.videoAttachments());
    if (!presignedUrl) throw new Error(`no presigned URL for video ${id}`);
    // B. transcode to FB reel format if needed
    console.log("transcoding video for FB reel", { presignedUrl });
    const container = await Binding.use().ContainerBackend.getByName("default");
    const { transcoded, outputUrl } = await container.transcodeVideo({
      inputUrl: presignedUrl,
      platform: Platform.FB_REEL,
    });
    console.log("transcoding result", { transcoded, outputUrl });

    if (!transcoded) {
      log.info("video does not need transcoding", { presignedUrl });
      return;
    }
    if (!outputUrl) throw new Error("no output URL from transcoding");
    log.info("video transcoded", { presignedUrl, outputUrl });
    // C. update the attachment to point to the new URL
    const attachments = c.videoAttachments().map((att) =>
      // use presigned url
      att.id === id ? { ...att, presignedUrl: outputUrl } : att,
    );
    if (attachments.length !== 1)
      throw new Error("expected exactly one video attachment");

    const [newOne] = await db()
      .update(unifiedContentTable)
      .set({
        placementSpec: {
          ...c.spec,
          attachments,
        },
      })
      .where(
        and(
          eq(unifiedContentTable.id, pendingContentID),
          eq(unifiedContentTable.workspaceId, Actor.workspaceID()),
        ),
      )
      .returning();
    if (!newOne)
      throw new Error("failed to update content with new attachment");
  });
  const { videoID } = await step.do("create single video post", async () => {
    const { content, client } = await loadFacebookFeedContext(pendingContentID);
    if (!content.isSingleVideoPost())
      throw new Error("not a single video post");
    const { presignedUrl } = onlyOrThrow(content.videoAttachments());
    if (!presignedUrl) throw new Error("no presigned URL for video attachment");

    const { videoId, uploadUrl } = await client.startVideoUpload();
    const { success, message } = await client.uploadVideoToSession(
      uploadUrl,
      presignedUrl,
    );
    log.info("uploaded video to FB session", { success, message });
    return { videoID: videoId };
  });
  // wait for upload, and copyright check
  await waitForVideoUpload(step, pendingContentID, videoID);

  const postId = await step.do("publish facebook reel", async () => {
    const { content, client } = await loadFacebookFeedContext(pendingContentID);
    const description = content.spec.postSpec.message;
    if (!description) throw new Error("no description provided");

    const { postId } = await client.finishVideoUpload({
      videoId: videoID,
      description,
    });
    return postId;
  });

  await waitForVideoPublish(step, pendingContentID, videoID);

  log.info("published single video post", { postId });
  return postId;
}
