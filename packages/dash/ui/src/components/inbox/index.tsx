import type { InboxConversationSummary } from "@shared/inbox";
import { useEffect, useMemo } from "react";
import { useSharedWorkspaceEvents } from "@/hooks/useWorkspaceWebSocket";
import { useInboxConversationQuery } from "@/queries/inbox/conversation";
import { useInboxConversationsQuery } from "@/queries/inbox/conversations";
import { useInboxMessagesQuery } from "@/queries/inbox/messages";
import { Route } from "@/routes/_authenticated/workspaces/$workspaceSlug/inbox";
import { useInboxStore } from "@/stores/inbox-store";
import { InboxChannelSwitcher } from "./inbox-channel-switcher";
import { InboxConversationPanel } from "./inbox-conversation-panel";
import { InboxSidebar } from "./inbox-sidebar";

export function Inbox() {
  const { workspaceSlug } = Route.useParams();
  const searchParams = Route.useSearch();

  // URL state is now source of truth for filters and selection
  const {
    channel = "all",
    platform = "all",
    conversationId,
    highlightMessageId: _highlightMessageId, // TODO: Phase 5 - implement message highlighting
    q: searchQuery,
  } = searchParams;

  // Zustand now only for caching and optimistic updates
  const initialize = useInboxStore((state) => state.initialize);
  const setConversations = useInboxStore((state) => state.setConversations);
  const setConversationLoadingState = useInboxStore(
    (state) => state.setConversationLoadingState,
  );
  const setMessages = useInboxStore((state) => state.setMessages);
  const setThreadFetching = useInboxStore((state) => state.setThreadFetching);
  const setThreadHasMore = useInboxStore((state) => state.setThreadHasMore);
  const upsertConversation = useInboxStore((state) => state.upsertConversation);
  const appendMessages = useInboxStore((state) => state.appendMessages);
  const conversationOrder = useInboxStore((state) => state.order);
  const conversationMap = useInboxStore((state) => state.byId);

  // Initialize store
  useEffect(() => {
    initialize(workspaceSlug);
  }, [workspaceSlug, initialize]);

  // Fetch conversations using URL params
  const conversationsQuery = useInboxConversationsQuery(workspaceSlug, {
    page: 1,
    pageSize: 25,
    ...(searchQuery?.trim() && { q: searchQuery.trim() }),
    platform: platform !== "all" ? platform : undefined,
    channel: channel !== "all" ? channel : undefined,
  });

  useEffect(() => {
    const data = conversationsQuery.data;
    if (!data) return;

    setConversations({
      conversations: data.items,
      pagination: {
        page: data.page,
        pageSize: data.pageSize,
        total: data.total,
        isFetching: conversationsQuery.isFetching,
      },
      replace: true,
    });
  }, [
    conversationsQuery.data,
    conversationsQuery.isFetching,
    setConversations,
  ]);

  useEffect(() => {
    if (conversationsQuery.isError) {
      setConversationLoadingState("error");
      return;
    }
    if (conversationsQuery.isFetching) {
      setConversationLoadingState("loading");
      return;
    }
    setConversationLoadingState("idle");
  }, [
    conversationsQuery.isError,
    conversationsQuery.isFetching,
    setConversationLoadingState,
  ]);

  // Fetch messages for current conversation (from URL)
  const effectiveConversationId = conversationId;
  const messagesQuery = useInboxMessagesQuery(
    workspaceSlug,
    effectiveConversationId,
    {
      page: 1,
      pageSize: 50,
    },
  );

  // Fetch conversation details including postPreview
  const conversationQuery = useInboxConversationQuery(
    workspaceSlug,
    effectiveConversationId,
  );

  useEffect(() => {
    if (!effectiveConversationId) return;
    setThreadFetching(effectiveConversationId, messagesQuery.isFetching);
  }, [effectiveConversationId, messagesQuery.isFetching, setThreadFetching]);

  // Update conversation with details (including postPreview) when fetched
  useEffect(() => {
    if (!conversationQuery.data) return;
    upsertConversation(conversationQuery.data);
  }, [conversationQuery.data, upsertConversation]);

  useEffect(() => {
    if (!effectiveConversationId) return;
    const data = messagesQuery.data;
    if (!data) return;

    setMessages({
      conversationId: effectiveConversationId,
      items: data.items,
      page: data.page,
      pageSize: data.pageSize,
      total: data.total,
      reset: true,
    });

    const hasMore = data.page * data.pageSize < data.total;
    setThreadHasMore(effectiveConversationId, hasMore);
  }, [
    effectiveConversationId,
    messagesQuery.data,
    setMessages,
    setThreadHasMore,
  ]);

  const conversations = useMemo(() => {
    const searchTerm = searchQuery?.trim().toLowerCase();
    return conversationOrder
      .map((id) => conversationMap[id])
      .filter((conversation): conversation is InboxConversationSummary =>
        Boolean(conversation),
      )
      .filter((conversation) => {
        if (channel !== "all" && conversation.channel !== channel) {
          return false;
        }
        if (platform !== "all" && conversation.platform !== platform) {
          return false;
        }
        if (!searchTerm) return true;
        const haystacks = [
          conversation.contact.name,
          conversation.connectedAccount.accountName ?? "",
        ]
          .join(" ")
          .toLowerCase();
        return haystacks.includes(searchTerm);
      });
  }, [conversationOrder, conversationMap, channel, platform, searchQuery]);

  const conversationsInitialLoading =
    conversationsQuery.isFetching && !conversationsQuery.data;
  const conversationsFetching = conversationsQuery.isFetching;

  const messagesInitialLoading =
    Boolean(effectiveConversationId) &&
    messagesQuery.isFetching &&
    !messagesQuery.data;
  const messagesFetching =
    Boolean(effectiveConversationId) && messagesQuery.isFetching;

  useSharedWorkspaceEvents({
    handlers: {
      "inbox.conversation.upserted": (event) => {
        const existing = useInboxStore.getState().byId[event.conversationId];
        if (!existing) return;

        upsertConversation({
          ...existing,
          lastMessageAt: new Date(event.lastMessageAt),
          contact: event.contact,
        });
      },
      "inbox.message.upserted": (event) => {
        appendMessages({
          conversationId: event.conversationId,
          items: [event.message],
        });
      },
    },
    enabled: Boolean(workspaceSlug),
  });

  return (
    <div className="flex h-full flex-col gap-4">
      <InboxChannelSwitcher
        totalCount={conversations.length}
        isSyncing={conversationsFetching}
      />
      <div className="flex flex-1 gap-4">
        <InboxSidebar
          conversations={conversations}
          isLoading={conversationsInitialLoading}
          isFetching={conversationsFetching}
        />
        <InboxConversationPanel
          workspaceSlug={workspaceSlug}
          isLoading={messagesInitialLoading}
          isFetching={messagesFetching}
        />
      </div>
    </div>
  );
}
