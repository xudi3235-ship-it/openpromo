import { useEffect } from "react";
import { useInboxConversationQuery } from "@/queries/inbox/conversation";
import { useInboxMessagesQuery } from "@/queries/inbox/messages";
import { Route } from "@/routes/_authenticated/workspaces/$workspaceSlug/inbox/$conversationId";
import { useInboxStore } from "@/stores/inbox-store";
import { InboxContextPanelV2 } from "./context-panel";
import { InboxConversationPanelV2 } from "./conversation-panel";
import { ConversationSplitLayout } from "./conversation-split-layout";

export function InboxConversationDetailV2() {
  const { workspaceSlug, conversationId } = Route.useParams();

  const setMessages = useInboxStore((state) => state.setMessages);
  const setThreadFetching = useInboxStore((state) => state.setThreadFetching);
  const setThreadHasMore = useInboxStore((state) => state.setThreadHasMore);
  const upsertConversation = useInboxStore((state) => state.upsertConversation);
  const conversationQuery = useInboxConversationQuery(
    workspaceSlug,
    conversationId,
  );

  const messagesQuery = useInboxMessagesQuery(workspaceSlug, conversationId, {
    page: 1,
    pageSize: 50,
  });

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
    const data = messagesQuery.data;
    if (!data) return;

    setMessages({
      conversationId,
      items: data.items,
      page: data.page,
      pageSize: data.pageSize,
      total: data.total,
      reset: true,
    });

    const hasMore = data.page * data.pageSize < data.total;
    setThreadHasMore(conversationId, hasMore);
  }, [conversationId, messagesQuery.data, setMessages, setThreadHasMore]);

  const messagesInitialLoading =
    messagesQuery.isFetching && !messagesQuery.data;
  const messagesFetching = messagesQuery.isFetching;

  return (
    <ConversationSplitLayout
      conversationPanel={
        <InboxConversationPanelV2
          workspaceSlug={workspaceSlug}
          conversationId={conversationId}
          conversation={conversationQuery.data ?? null}
          isLoading={messagesInitialLoading}
          isFetching={messagesFetching}
        />
      }
      contextPanel={
        <InboxContextPanelV2 conversation={conversationQuery.data ?? null} />
      }
    />
  );
}
