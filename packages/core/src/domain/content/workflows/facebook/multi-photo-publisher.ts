import { ImageStorage } from "@core/helpers/storage/image";
import type {
  CoreWorkflowContext,
  CoreWorkflowStep,
} from "@core/helpers/workflow";
import { WorkflowError } from "@core/utils/error";
import { Log } from "@core/utils/log";
import { loadFacebookFeedContext } from "./facebook-feed-service";

const log = Log.create({ namespace: "facebook-multi-photo" });

export async function publishMultiPhotoPost(
  _ctx: CoreWorkflowContext,
  step: CoreWorkflowStep,
  pendingContentID: string,
): Promise<string> {
  const postId = await step.do("create multi-photo post", async () => {
    const { content, client } = await loadFacebookFeedContext(pendingContentID);

    if (!content.isMultiPhotoPost()) {
      throw new WorkflowError(
        `content ${pendingContentID} is not a multi-photo Facebook post`,
      );
    }

    const photoAttachments = content.photosAttachments();
    if (photoAttachments.length === 0) {
      throw new WorkflowError(
        `content ${pendingContentID} is missing photo attachments`,
      );
    }

    const uploadedPhotoIds: string[] = [];

    for (const attachment of photoAttachments) {
      if (!attachment.id) {
        throw new WorkflowError(
          `photo attachment missing id for content ${pendingContentID}`,
        );
      }

      const cdnUrl = await ImageStorage.getImageDeliveryUrl(attachment.id);
      const photoId = await client.uploadPhoto(cdnUrl);
      uploadedPhotoIds.push(photoId);
    }

    const message = content.spec.postSpec.message?.trim();

    const { postId } = await client.createFeedPost({
      message: message && message.length > 0 ? message : undefined,
      attachedMedia: uploadedPhotoIds.map((photoId) => ({
        media_fbid: photoId,
      })),
    });

    return postId;
  });

  log.info("published multi-photo post", { postId });
  return postId;
}
