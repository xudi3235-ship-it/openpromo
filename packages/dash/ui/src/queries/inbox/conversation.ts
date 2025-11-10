import type { QueryClient } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import { useWorkspace } from "@/hooks/useWorkspace";
import { orpc } from "@/lib/orpc-client";

const getConversationOptions = (
  workspaceSlug: string,
  conversationId: string,
) =>
  orpc.inbox.getConversation.queryOptions({
    input: { workspaceSlug, conversationId },
  });

export function useInboxConversationQuery(conversationId: string | undefined) {
  const { workspace } = useWorkspace();
  return useQuery({
    ...getConversationOptions(
      workspace.slug,
      // biome-ignore lint/style/noNonNullAssertion: guarded by enabled
      conversationId!,
    ),
    enabled: Boolean(conversationId),
  });
}

export async function prefetchInboxConversation(
  queryClient: QueryClient,
  workspaceSlug: string,
  conversationId: string,
) {
  await queryClient.prefetchQuery(
    getConversationOptions(workspaceSlug, conversationId),
  );
}
