import { Platform } from "@core/containers";
import { and, db, eq } from "@core/database/db";
import { Actor } from "@core/helpers/actor";
import { Binding } from "@core/helpers/api-env";
import type {
  CoreWorkflowContext,
  CoreWorkflowStep,
} from "@core/helpers/workflow";
import { unifiedContentTable } from "@core/schemas/content.sql";
import { onlyOrThrow } from "@core/utils/common";
import { Log } from "@core/utils/log";
import { waitForVideoContainer } from "./common";
import { loadInstagramFeedContext } from "./instagram-feed-service";

const log = Log.create({ namespace: "instagram-single-video-reel" });

export async function publishSingleVideoReel(
  _ctx: CoreWorkflowContext,
  step: CoreWorkflowStep,
  pendingContentID: string,
): Promise<string> {
  await step.do("transcode IG reel if needed", async () => {
    // A. sanitize, get the download Url
    const { content: c } = await loadInstagramFeedContext(pendingContentID);
    if (!c.isSingleVideoReel()) throw new Error("not a IG reel");
    const { id, presignedUrl } = onlyOrThrow(c.videoAttachments());
    if (!presignedUrl) throw new Error(`no presigned URL for video ${id}`);
    // B. transcode to IG reel format if needed
    console.log("transcoding video for IG reel", { presignedUrl });
    const container = await Binding.use().ContainerBackend.getByName("default");
    const { transcoded, outputUrl } = await container.transcodeVideo({
      inputUrl: presignedUrl,
      platform: Platform.IG_REEL,
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

  const { containerId, caption } = await step.do(
    "create reel container",
    async () => {
      console.log("// creating reel container");
      const { content, client } =
        await loadInstagramFeedContext(pendingContentID);
      console.log("// creating reel container - got pending content", {
        id: content.data.id,
      });

      if (!content.isSingleVideoReel()) {
        throw new Error("not a IG reel");
      }

      const { presignedUrl } = onlyOrThrow(content.videoAttachments());
      if (!presignedUrl) throw new Error("video missing presignedUrl");

      const caption = content.caption() ?? "";
      const containerId = await client.createMediaContainer({
        caption,
        videoUrl: presignedUrl,
        mediaType: "REELS",
      });
      return { containerId, caption };
    },
  );

  console.log("// created reel container", { containerId });

  await waitForVideoContainer(step, pendingContentID, containerId, 0);

  const postId = await step.do("publish reel", async () => {
    const { client } = await loadInstagramFeedContext(pendingContentID);
    const { postId } = await client.publishContainer({
      creationId: containerId,
      caption,
    });
    return postId;
  });

  log.info("published single video reel", { postId });
  return postId;
}
