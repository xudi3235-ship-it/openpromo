import { useEffect, useRef } from "react";
import { useInboxConversationQuery } from "@/queries/inbox/conversation";
import { useInboxMessagesInfiniteQuery } from "@/queries/inbox/messages";
import { Route } from "@/routes/_authenticated/workspaces/$workspaceSlug/inbox/$conversationId";
import { useInboxStore } from "@/stores/inbox-store";
import { InboxContextPanelV2 } from "./context-panel";
import { InboxConversationPanelV2 } from "./conversation-panel";
import { ConversationSplitLayout } from "./conversation-split-layout";

export function InboxConversationDetailV2() {
  const { conversationId } = Route.useParams();
  const hasInitializedMessagesRef = useRef<Record<string, boolean>>({});
  // Track last synced message IDs to avoid unnecessary syncs
  const lastSyncedMessageIdsRef = useRef<Record<string, string>>({});

  const syncMessagesFromQuery = useInboxStore(
    (state) => state.syncMessagesFromQuery,
  );
  const setThreadFetching = useInboxStore((state) => state.setThreadFetching);
  const upsertConversation = useInboxStore((state) => state.upsertConversation);
  const conversationFromStore = useInboxStore((state) => {
    if (!conversationId) return null;
    return state.byId[conversationId] ?? null;
  });
  const conversationQuery = useInboxConversationQuery(conversationId);

  const messagesQuery = useInboxMessagesInfiniteQuery(conversationId, 50);

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

    // Only reset on very first load for this conversation, otherwise merge to preserve websocket updates
    const isInitialLoad =
      !hasInitializedMessagesRef.current[conversationId] &&
      messagesQuery.data.pages.length === 1;

    if (isInitialLoad) {
      hasInitializedMessagesRef.current[conversationId] = true;
    }

    const allMessages =
      messagesQuery.data.pages.flatMap((page) => page.items) ?? [];

    // Create a hash of message IDs to detect if data actually changed
    // This prevents unnecessary syncs that might overwrite WebSocket updates
    const messageIdsHash = allMessages
      .map((m) => m.id)
      .sort()
      .join(",");

    const lastSyncedHash = lastSyncedMessageIdsRef.current[conversationId];

    // Skip sync if message IDs haven't changed (avoid overwriting WebSocket updates)
    // But always sync on initial load
    if (!isInitialLoad && lastSyncedHash === messageIdsHash) {
      return;
    }

    syncMessagesFromQuery({
      conversationId,
      items: allMessages,
      page: firstPage.page,
      pageSize: firstPage.pageSize,
      total: firstPage.total,
      hasNextPage: Boolean(messagesQuery.hasNextPage),
      isInitialLoad,
    });

    // Update the last synced hash
    lastSyncedMessageIdsRef.current[conversationId] = messageIdsHash;
  }, [
    conversationId,
    messagesQuery.data,
    messagesQuery.hasNextPage,
    syncMessagesFromQuery,
  ]);

  // Reset sync tracking when conversation changes
  useEffect(() => {
    if (
      conversationId &&
      lastSyncedMessageIdsRef.current[conversationId] === undefined
    ) {
      // Reset on conversation change
      delete lastSyncedMessageIdsRef.current[conversationId];
    }
  }, [conversationId]);

  const messagesInitialLoading = messagesQuery.isPending;
  const messagesFetching = messagesQuery.isFetching;
  const activeConversation = conversationQuery.data ?? conversationFromStore;

  const conversationLoading =
    conversationQuery.isPending && Boolean(conversationId);
  const hasConversationSelection = Boolean(conversationId);

  return (
    <ConversationSplitLayout
      conversationPanel={
        <InboxConversationPanelV2
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
