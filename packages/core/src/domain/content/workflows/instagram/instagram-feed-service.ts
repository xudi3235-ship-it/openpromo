import { EntIGFeedPendingContent } from "@core/domain/content/entity";
import { InstagramMediaClient } from "@core/domain/content/entity/instagram/media-client";

export interface InstagramFeedContext {
  content: EntIGFeedPendingContent;
  client: InstagramMediaClient;
}

export async function loadInstagramFeedContext(
  pendingContentID: string,
): Promise<InstagramFeedContext> {
  const content = await EntIGFeedPendingContent.fromID(pendingContentID);
  const client = await InstagramMediaClient.forPlacementSpec(content.spec);
  return { content, client };
}
