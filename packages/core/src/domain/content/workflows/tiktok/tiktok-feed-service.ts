import { EntTikTokFeedPendingContent } from "@core/domain/content/entity";
import { TikTokDirectPostClient } from "@core/domain/content/entity/tiktok/direct-post-client";

export interface TikTokFeedContext {
  content: EntTikTokFeedPendingContent;
  client: TikTokDirectPostClient;
}

export async function loadTikTokFeedContext(
  pendingContentID: string,
): Promise<TikTokFeedContext> {
  const content = await EntTikTokFeedPendingContent.fromID(pendingContentID);
  const client = await TikTokDirectPostClient.forPlacementSpec(content.spec);
  return { content, client };
}
