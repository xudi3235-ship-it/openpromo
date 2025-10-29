import { useEffect } from "react";
import { useInboxConversationQuery } from "@/queries/inbox/conversation";
import { useInboxMessagesQuery } from "@/queries/inbox/messages";
import { Route } from "@/routes/_authenticated/workspaces/$workspaceSlug/inbox/$conversationId";
import { useInboxStore } from "@/stores/inbox-store";
import { InboxContextPanel } from "./inbox-context-panel";
import { InboxConversationPanel } from "./inbox-conversation-panel";

export function InboxConversationDetail() {
  const { workspaceSlug, conversationId } = Route.useParams();

  const setMessages = useInboxStore((state) => state.setMessages);
  const setThreadFetching = useInboxStore((state) => state.setThreadFetching);
  const setThreadHasMore = useInboxStore((state) => state.setThreadHasMore);
  const upsertConversation = useInboxStore((state) => state.upsertConversation);

  // Fetch conversation details and messages
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
    <>
      <InboxConversationPanel
        workspaceSlug={workspaceSlug}
        conversationId={conversationId}
        conversation={conversationQuery.data ?? null}
        isLoading={messagesInitialLoading}
        isFetching={messagesFetching}
      />
      <InboxContextPanel conversation={conversationQuery.data ?? null} />
    </>
  );
}
