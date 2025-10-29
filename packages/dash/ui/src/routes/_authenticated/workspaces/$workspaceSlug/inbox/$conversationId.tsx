import { createFileRoute } from "@tanstack/react-router";
import { InboxConversationDetail } from "@/components/inbox/inbox-conversation-detail";
import { InboxConversationPending } from "@/components/inbox/inbox-conversation-pending";
import { prefetchInboxConversation } from "@/queries/inbox/conversation";
import { prefetchInboxMessages } from "@/queries/inbox/messages";

type ConversationSearchParams = {
  highlightMessageId?: string;
};

export const Route = createFileRoute(
  "/_authenticated/workspaces/$workspaceSlug/inbox/$conversationId",
)({
  validateSearch: (
    search: Record<string, unknown>,
  ): ConversationSearchParams => {
    return {
      highlightMessageId:
        typeof search.highlightMessageId === "string"
          ? search.highlightMessageId
          : undefined,
    };
  },
  loader: async ({ params, context }) => {
    // Prefetch conversation details and messages
    await Promise.all([
      prefetchInboxConversation(
        context.queryClient,
        params.workspaceSlug,
        params.conversationId,
      ),
      prefetchInboxMessages(
        context.queryClient,
        params.workspaceSlug,
        params.conversationId,
        {
          page: 1,
          pageSize: 50,
        },
      ),
    ]);
  },
  component: InboxConversationDetail,
  pendingComponent: InboxConversationPending,
});
