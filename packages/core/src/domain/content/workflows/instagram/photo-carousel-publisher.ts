import type {
  CoreWorkflowContext,
  CoreWorkflowStep,
} from "@core/helpers/workflow";
import { WorkflowError } from "@core/utils/error";
import { Log } from "@core/utils/log";
import { loadInstagramFeedContext } from "./instagram-feed-service";

const log = Log.create({ namespace: "instagram-photo-carousel" });

export async function publishPhotoCarousel(
  _ctx: CoreWorkflowContext,
  step: CoreWorkflowStep,
  pendingContentID: string,
): Promise<string> {
  const postId = await step.do("create photo carousel", async () => {
    const { content, client } =
      await loadInstagramFeedContext(pendingContentID);

    if (!content.isPhotoCarousel() || content.isMixedCarousel()) {
      throw new WorkflowError(
        `content ${pendingContentID} is not an Instagram photo carousel`,
      );
    }

    const photos = content.photosAttachments();
    if (photos.length === 0) {
      throw new WorkflowError(
        `content ${pendingContentID} missing photo attachments`,
      );
    }

    const caption = content.caption() ?? "";
    const containerIds: string[] = [];

    for (const photo of photos) {
      if (!photo.publicUrl) {
        throw new WorkflowError(
          `photo attachment missing publicUrl for content ${pendingContentID}`,
        );
      }

      const containerId = await client.createMediaContainer({
        caption,
        imageUrl: photo.publicUrl,
        isCarouselItem: true,
      });
      containerIds.push(containerId);
    }

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

  log.info("published photo carousel", { postId });
  return postId;
}
