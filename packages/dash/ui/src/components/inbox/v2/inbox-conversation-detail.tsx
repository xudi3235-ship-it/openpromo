import { useEffect } from "react";
import { useInboxConversationQuery } from "@/queries/inbox/conversation";
import { useMarkConversationRead } from "@/queries/inbox/conversations";
import { useInboxMessagesInfiniteQuery } from "@/queries/inbox/messages";
import { Route } from "@/routes/_authenticated/workspaces/$workspaceSlug/inbox/$conversationId";
import { useInboxStore } from "@/stores/inbox-store";
import { InboxContextPanelV2 } from "./context-panel";
import { InboxConversationPanelV2 } from "./conversation-panel";
import { ConversationSplitLayout } from "./conversation-split-layout";

export function InboxConversationDetailV2() {
  const { workspaceSlug, conversationId } = Route.useParams();
  const markAsRead = useMarkConversationRead(workspaceSlug);

  const syncMessagesFromQuery = useInboxStore(
    (state) => state.syncMessagesFromQuery,
  );
  const setThreadFetching = useInboxStore((state) => state.setThreadFetching);
  const upsertConversation = useInboxStore((state) => state.upsertConversation);
  const conversationFromStore = useInboxStore((state) => {
    if (!conversationId) return null;
    return state.byId[conversationId] ?? null;
  });
  const conversationQuery = useInboxConversationQuery(
    workspaceSlug,
    conversationId,
  );

  const messagesQuery = useInboxMessagesInfiniteQuery(
    workspaceSlug,
    conversationId,
    50,
  );

  const allMessages =
    messagesQuery.data?.pages.flatMap((page) => page.items) ?? [];

  useEffect(() => {
    if (!conversationId) return;
    setThreadFetching(conversationId, messagesQuery.isFetching);
  }, [conversationId, messagesQuery.isFetching, setThreadFetching]);

  useEffect(() => {
    if (!conversationQuery.data) return;
    upsertConversation(conversationQuery.data);
  }, [conversationQuery.data, upsertConversation]);

  useEffect(() => {
    if (!conversationId) return;
    if (!messagesQuery.data) return;

    const firstPage = messagesQuery.data.pages[0];
    if (!firstPage) return;

    // Only reset on initial load (when we only have 1 page and it's the first fetch)
    // Otherwise merge to preserve websocket updates
    const isInitialLoad =
      messagesQuery.data.pages.length === 1 && !messagesQuery.isFetching;

    syncMessagesFromQuery({
      conversationId,
      items: allMessages,
      page: firstPage.page,
      pageSize: firstPage.pageSize,
      total: firstPage.total,
      hasNextPage: Boolean(messagesQuery.hasNextPage),
      isInitialLoad,
    });
  }, [
    conversationId,
    messagesQuery.data,
    messagesQuery.hasNextPage,
    messagesQuery.isFetching,
    allMessages,
    syncMessagesFromQuery,
  ]);

  const messagesInitialLoading =
    messagesQuery.isFetching && !messagesQuery.data;
  const messagesFetching = messagesQuery.isFetching;
  const activeConversation = conversationQuery.data ?? conversationFromStore;

  // Auto mark-as-read when conversation is opened
  useEffect(() => {
    if (!conversationId) return;
    if (!activeConversation) return;
    if (!activeConversation.isUnread) return;

    // Mark as read
    markAsRead.mutate(conversationId);
  }, [conversationId, activeConversation, markAsRead]);
  const conversationLoading =
    Boolean(conversationId) &&
    conversationQuery.isFetching &&
    !activeConversation;
  const hasConversationSelection = Boolean(conversationId);

  return (
    <ConversationSplitLayout
      conversationPanel={
        <InboxConversationPanelV2
          workspaceSlug={workspaceSlug}
          conversationId={conversationId}
          conversation={activeConversation}
          isLoading={messagesInitialLoading}
          isFetching={messagesFetching}
          isConversationLoading={conversationLoading}
          hasNextPage={messagesQuery.hasNextPage}
          fetchNextPage={messagesQuery.fetchNextPage}
          isFetchingNextPage={messagesQuery.isFetchingNextPage}
        />
      }
      contextPanel={
        <InboxContextPanelV2
          conversation={activeConversation}
          isLoading={conversationLoading}
          hasSelection={hasConversationSelection}
        />
      }
    />
  );
}
