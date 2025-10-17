import type {
  CoreWorkflowContext,
  CoreWorkflowStep,
} from "@core/helpers/workflow";
import { WorkflowError } from "@core/utils/error";
import { Log } from "@core/utils/log";
import { loadInstagramFeedContext } from "./instagram-feed-service";

const log = Log.create({ namespace: "instagram-single-photo" });

export async function publishSinglePhoto(
  _ctx: CoreWorkflowContext,
  step: CoreWorkflowStep,
  pendingContentID: string,
): Promise<string> {
  console.log(`// Publishing single photo post: ${pendingContentID}`);
  const postId = await step.do("create single photo post", async () => {
    const { content, client } =
      await loadInstagramFeedContext(pendingContentID);

    if (!content.isSinglePhoto()) {
      throw new WorkflowError(
        `content ${pendingContentID} is not an Instagram single photo post`,
      );
    }
    console.log("// Loaded content and client for single photo post");

    const [photo] = content.photosAttachments();
    if (!photo || !photo.publicUrl) {
      throw new WorkflowError(
        `content ${pendingContentID} missing photo publicUrl`,
      );
    }

    const caption = content.caption() ?? "";
    console.log(`// Creating media container with caption: ${caption}`);
    const containerId = await client.createMediaContainer({
      caption,
      imageUrl: photo.publicUrl,
    });
    console.log(`// Created media container: ${containerId}`);
    const { postId } = await client.publishContainer({
      creationId: containerId,
      caption,
    });
    console.log(`// Published media container: ${postId}`);
    return postId;
  });

  log.info("published single photo", { postId });
  return postId;
}
