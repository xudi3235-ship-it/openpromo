import type {
  CoreWorkflowContext,
  CoreWorkflowStep,
} from "@core/helpers/workflow";
import { WorkflowError } from "@core/utils/error";
import { Log } from "@core/utils/log";
import { waitForVideoContainer } from "./common";
import { loadInstagramFeedContext } from "./instagram-feed-service";

const log = Log.create({ namespace: "instagram-mixed-carousel" });

export async function publishMixedCarousel(
  _ctx: CoreWorkflowContext,
  step: CoreWorkflowStep,
  pendingContentID: string,
): Promise<string> {
  const { containerIds, videoContainerInfo, caption } = await step.do(
    "create mixed carousel containers",
    async () => {
      const { content, client } =
        await loadInstagramFeedContext(pendingContentID);

      if (!content.isMixedCarousel()) {
        throw new WorkflowError(
          `content ${pendingContentID} is not an Instagram mixed carousel`,
        );
      }

      const attachments = content.attachments();
      if (attachments.length === 0) {
        throw new WorkflowError(
          `content ${pendingContentID} missing attachments`,
        );
      }

      if (attachments.length > 10) {
        throw new WorkflowError(
          `content ${pendingContentID} has ${attachments.length} attachments; Instagram carousel supports max 10`,
        );
      }

      const containerIds: string[] = [];
      const videoContainerInfo: Array<{ id: string; index: number }> = [];
      const caption = content.caption() ?? "";

      for (let index = 0; index < attachments.length; index++) {
        const attachment = attachments[index];

        if (attachment.type === "photo") {
          if (!attachment.publicUrl) {
            throw new WorkflowError(
              `photo attachment missing publicUrl at index ${index} for content ${pendingContentID}`,
            );
          }

          const containerId = await client.createMediaContainer({
            caption,
            imageUrl: attachment.publicUrl,
            isCarouselItem: true,
          });
          containerIds.push(containerId);
        } else if (attachment.type === "video") {
          if (!attachment.presignedUrl) {
            throw new WorkflowError(
              `video attachment missing presignedUrl at index ${index} for content ${pendingContentID}`,
            );
          }

          const containerId = await client.createMediaContainer({
            caption,
            videoUrl: attachment.presignedUrl,
            mediaType: "VIDEO",
            isCarouselItem: true,
          });
          containerIds.push(containerId);
          videoContainerInfo.push({ id: containerId, index });
        } else {
          throw new WorkflowError(
            `unsupported attachment type ${attachment ?? "unknown"} at index ${index} for content ${pendingContentID}`,
          );
        }
      }

      return {
        containerIds,
        videoContainerInfo,
        caption,
      };
    },
  );

  if (videoContainerInfo.length > 0) {
    for (const { id: containerId, index } of videoContainerInfo) {
      await waitForVideoContainer(step, pendingContentID, containerId, index);
    }
  }

  const postId = await step.do("publish mixed carousel", async () => {
    const { client } = await loadInstagramFeedContext(pendingContentID);

    const parentContainerId = await client.createMediaContainer({
      caption,
      mediaType: "CAROUSEL",
      children: containerIds,
    });

    const { postId } = await client.publishContainer({
      creationId: parentContainerId,
      caption,
    });

    return postId;
  });

  log.info("published mixed carousel", { postId });
  return postId;
}
