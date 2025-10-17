import { EntFBFeedPendingContent } from "@core/domain/content/entity";
import { FacebookPageClient } from "@core/domain/content/entity/facebook/page-client";

export interface FacebookFeedContext {
  content: EntFBFeedPendingContent;
  client: FacebookPageClient;
}

export async function loadFacebookFeedContext(
  pendingContentID: string,
): Promise<FacebookFeedContext> {
  const content = await EntFBFeedPendingContent.fromID(pendingContentID);
  const client = await FacebookPageClient.forPlacementSpec(content.spec);
  return { content, client };
}
