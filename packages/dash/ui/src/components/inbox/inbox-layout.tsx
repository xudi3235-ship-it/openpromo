import type { InboxConversationSummary } from "@shared/inbox";
import { Outlet } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { useSharedWorkspaceEvents } from "@/hooks/useWorkspaceWebSocket";
import { useInboxConversationsInfiniteQuery } from "@/queries/inbox/conversations";
import { Route } from "@/routes/_authenticated/workspaces/$workspaceSlug/inbox";
import { useInboxStore } from "@/stores/inbox-store";
import { InboxChannelSwitcher } from "./inbox-channel-switcher";
import { InboxSidebar } from "./inbox-sidebar";

export function InboxLayout() {
  const { workspaceSlug } = Route.useParams();
  const searchParams = Route.useSearch();

  const { channel = "all", platform = "all", q: searchQuery } = searchParams;

  // Zustand for caching
  const initialize = useInboxStore((state) => state.initialize);
  const setConversations = useInboxStore((state) => state.setConversations);
  const setConversationLoadingState = useInboxStore(
    (state) => state.setConversationLoadingState,
  );
  const upsertConversation = useInboxStore((state) => state.upsertConversation);
  const appendMessages = useInboxStore((state) => state.appendMessages);
  const conversationOrder = useInboxStore((state) => state.order);
  const conversationMap = useInboxStore((state) => state.byId);

  // Initialize store
  useEffect(() => {
    initialize(workspaceSlug);
  }, [workspaceSlug, initialize]);

  // Fetch conversations using URL params (infinite query)
  const conversationsQuery = useInboxConversationsInfiniteQuery(
    workspaceSlug,
    {
      ...(searchQuery?.trim() && { q: searchQuery.trim() }),
      platform: platform !== "all" ? platform : undefined,
      channel: channel !== "all" ? channel : undefined,
    },
    25, // pageSize
  );

  useEffect(() => {
    if (!conversationsQuery.conversations.length) return;

    setConversations({
      conversations: conversationsQuery.conversations,
      pagination: {
        page: conversationsQuery.data?.pages.length ?? 1,
        pageSize: 25,
        total: conversationsQuery.totalCount,
        isFetching: conversationsQuery.isFetching,
      },
      replace: true,
    });
  }, [
    conversationsQuery.conversations,
    conversationsQuery.data?.pages.length,
    conversationsQuery.totalCount,
    conversationsQuery.isFetching,
    setConversations,
  ]);

  useEffect(() => {
    if (conversationsQuery.isError) {
      setConversationLoadingState("error");
      return;
    }
    if (conversationsQuery.isFetching && !conversationsQuery.data) {
      setConversationLoadingState("loading");
      return;
    }
    setConversationLoadingState("idle");
  }, [
    conversationsQuery.isError,
    conversationsQuery.isFetching,
    conversationsQuery.data,
    setConversationLoadingState,
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
    <div className="flex h-full flex-col gap-2.5">
      <InboxChannelSwitcher
        totalCount={conversationsQuery.totalCount}
        isSyncing={conversationsFetching}
      />
      <div className="flex flex-1 gap-3 overflow-hidden">
        <InboxSidebar
          conversations={conversations}
          isLoading={conversationsInitialLoading}
          isFetching={conversationsFetching}
          hasNextPage={conversationsQuery.hasNextPage}
          fetchNextPage={conversationsQuery.fetchNextPage}
          isFetchingNextPage={conversationsQuery.isFetchingNextPage}
        />
        <Outlet />
      </div>
    </div>
  );
}
