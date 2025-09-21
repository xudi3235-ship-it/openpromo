import { EntFBFeedPendingContent } from "@core/domain/content/entity";
import { Actor } from "@core/helpers/actor";
import { and, db, eq } from "@core/helpers/db";
import type {
  CoreWorkflowContext,
  CoreWorkflowStep,
} from "@core/helpers/workflow";
import opClient from "@core/providers/backend";
import { unifiedContentTable } from "@core/schemas/content.sql";
import { onlyOrThrow } from "@core/utils/common";
import { Log } from "@core/utils/log";
import { waitForVideoPublish, waitForVideoUpload } from "./common";

const log = Log.create({ namespace: "facebook-single-video" });

export async function publishSingleVideoPost(
  _ctx: CoreWorkflowContext,
  step: CoreWorkflowStep,
  pendingContentID: string,
): Promise<string> {
  // 0. transcode video if needed
  await step.do("transcode FB reel if needed", async () => {
    // A. sanitize, get the input url
    const c = await EntFBFeedPendingContent.fromID(pendingContentID);
    if (!c.isSingleVideoPost()) throw new Error("not a single video post");
    const { publicUrl } = onlyOrThrow(c.videoAttachments());
    if (!publicUrl) throw new Error("no public URL for video");
    // B. transcode to FB reel format if needed
    const { transcoded, output_url } = await opClient.client.video.transcode({
      platform: "fb_reel",
      input_url: publicUrl,
    });

    if (!transcoded) {
      log.info("video does not need transcoding", { publicUrl });
      return;
    }
    if (!output_url) throw new Error("no output URL from transcoding");
    log.info("video transcoded", { publicUrl, output_url });
    // C. update the attachment to point to the new URL
    const attachments = c
      .videoAttachments()
      .map((att) =>
        att.publicUrl === publicUrl ? { ...att, publicUrl: output_url } : att,
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
    const c = await EntFBFeedPendingContent.fromID(pendingContentID);
    const { video_id: videoID, upload_url } = await c.initVideoUploadSession();
    const { success, message } =
      await c.uploadInternalVideoToSession(upload_url);
    log.info("uploaded video to FB session", { success, message });
    return { videoID };
  });
  // wait for upload, and copyright check
  await waitForVideoUpload(step, pendingContentID, videoID);

  const postId = await step.do("publish facebook reel", async () => {
    const c = await EntFBFeedPendingContent.fromID(pendingContentID);
    const { postId } = await c.createReel(videoID);
    return postId;
  });

  await waitForVideoPublish(step, pendingContentID, videoID);

  log.info("published single video post", { postId });
  return postId;
}
