import type { InfiniteData } from "@tanstack/react-query";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { InboxConversationsList } from "@worker/routes/api/workspaces/inbox";
import { orpc } from "@/lib/orpc-client";

export function useDeleteConversationOrpc(workspaceSlug: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation(
    orpc.inbox.deleteConversation.mutationOptions({
      onSuccess: (_data, variables) => {
        const conversationId = variables.conversationId;
        // Update the infinite query cache to remove the deleted conversation
        queryClient.setQueriesData<InfiniteData<InboxConversationsList>>(
          {
            queryKey: ["inbox", "conversations", workspaceSlug],
            exact: false,
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
              };
            });

            if (removed === 0) {
              return oldData;
            }

            return {
              ...oldData,
              pages,
            };
          },
        );
      },
    }),
  );
}
