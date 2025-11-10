import type { InfiniteData } from "@tanstack/react-query";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { InboxConversationsList } from "@worker/inbox/types";
import { useWorkspace } from "@/hooks/useWorkspace";
import { orpc } from "@/lib/orpc-client";

export function useDeleteConversationOrpc() {
  const queryClient = useQueryClient();
  const { workspace } = useWorkspace();

  return useMutation(
    orpc.inbox.deleteConversation.mutationOptions({
      onSuccess: (_data, variables) => {
        const conversationId = variables.conversationId;
        if (!workspace.slug) {
          return;
        }

        const conversationsKey = orpc.inbox.listConversations.key({
          input: { workspaceSlug: workspace.slug },
        });

        queryClient.setQueriesData<InfiniteData<InboxConversationsList>>(
          {
            queryKey: conversationsKey,
          },
          (oldData) => {
            if (!oldData?.pages || !Array.isArray(oldData.pages)) {
              return oldData;
            }

            let removed = 0;
            const pages = oldData.pages.map((page) => {
              if (!page?.items || !Array.isArray(page.items)) {
                return page;
              }
              const filtered = page.items.filter((item) => {
                const keep = item?.id !== conversationId;
                if (!keep) {
                  removed += 1;
                }
                return keep;
              });

              if (filtered.length === page.items.length) {
                return page;
              }

              return {
                ...page,
                items: filtered,
                total: Math.max(0, page.total - 1),
              } satisfies InboxConversationsList;
            });

            if (removed === 0) {
              return oldData;
            }

            return {
              ...oldData,
              pages,
            } satisfies InfiniteData<InboxConversationsList>;
          },
        );
      },
    }),
  );
}
