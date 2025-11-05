import { Page, PageContent } from "@openpromo/ui/components/page";
import type { InboxConversationSummary } from "@shared/inbox";
import { Outlet } from "@tanstack/react-router";
import { useEffect, useMemo, useRef } from "react";
import { useWorkspaceEvents } from "@/hooks/useWorkspaceWebSocket";
import { useInboxConversationsInfiniteQuery } from "@/queries/inbox/conversations";
import { Route } from "@/routes/_authenticated/workspaces/$workspaceSlug/inbox";
import { useInboxStore } from "@/stores/inbox-store";
import { InboxChannelSwitcher } from "./inbox-channel-switcher";
import { InboxSidebar } from "./inbox-sidebar";

export function InboxLayout() {
  const { workspaceSlug } = Route.useParams();
  const searchParams = Route.useSearch();
  const hasInitializedRef = useRef(false);

  const {
    channel = "all",
    platform = "all",
    q: searchQuery,
    unread,
  } = searchParams;

  // Zustand for caching
  const initialize = useInboxStore((state) => state.initialize);
  const syncConversationsFromQuery = useInboxStore(
    (state) => state.syncConversationsFromQuery,
  );
  const setConversationLoadingState = useInboxStore(
    (state) => state.setConversationLoadingState,
  );
  const handleConversationUpserted = useInboxStore(
    (state) => state.handleConversationUpserted,
  );
  const handleMessageUpserted = useInboxStore(
    (state) => state.handleMessageUpserted,
  );
  const conversationOrder = useInboxStore((state) => state.order);
  const conversationMap = useInboxStore((state) => state.byId);

  // Initialize store
  useEffect(() => {
    initialize(workspaceSlug);
    hasInitializedRef.current = false; // Reset on workspace change
  }, [workspaceSlug, initialize]);

  // Fetch conversations using URL params (infinite query)
  const conversationsQuery = useInboxConversationsInfiniteQuery(
    workspaceSlug,
    {
      ...(searchQuery?.trim() && { q: searchQuery.trim() }),
      platform: platform !== "all" ? platform : undefined,
      channel: channel !== "all" ? channel : undefined,
      ...(unread !== undefined && { unread }),
    },
    25, // pageSize
  );

  useEffect(() => {
    if (!conversationsQuery.conversations.length) return;

    // Only replace on very first load, otherwise merge to preserve websocket updates
    const isInitialLoad =
      !hasInitializedRef.current && conversationsQuery.data?.pages.length === 1;

    if (isInitialLoad) {
      hasInitializedRef.current = true;
    }

    syncConversationsFromQuery({
      conversations: conversationsQuery.conversations,
      pagination: {
        page: conversationsQuery.data?.pages.length ?? 1,
        pageSize: 25,
        total: conversationsQuery.totalCount,
        isFetching: conversationsQuery.isFetching,
      },
      isInitialLoad,
    });
  }, [
    conversationsQuery.conversations,
    conversationsQuery.data?.pages.length,
    conversationsQuery.totalCount,
    conversationsQuery.isFetching,
    syncConversationsFromQuery,
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

  useWorkspaceEvents({
    handlers: {
      "inbox.conversation.upserted": (event) => {
        const existing = conversationMap[event.conversationId];

        if (!existing) {
          conversationsQuery.refetch();
          return;
        }

        handleConversationUpserted({
          conversationId: event.conversationId,
          lastMessageAt: new Date(event.lastMessageAt),
          contact: event.contact,
          isUnread: event.isUnread,
          lastReadAt: event.lastReadAt ? new Date(event.lastReadAt) : null,
        });
      },
      "inbox.message.upserted": (event) => {
        handleMessageUpserted({
          conversationId: event.conversationId,
          message: event.message,
        });
      },
    },
    enabled: Boolean(workspaceSlug),
  });

  return (
    <Page gap="sm" className="h-full">
      <InboxChannelSwitcher
        totalCount={conversationsQuery.totalCount}
        isSyncing={conversationsFetching}
      />
      <PageContent direction="row" gap="sm" className="flex-1 overflow-hidden">
        <InboxSidebar
          conversations={conversations}
          isLoading={conversationsInitialLoading}
          isFetching={conversationsFetching}
          hasNextPage={conversationsQuery.hasNextPage}
          fetchNextPage={conversationsQuery.fetchNextPage}
          isFetchingNextPage={conversationsQuery.isFetchingNextPage}
        />
        <Outlet />
      </PageContent>
    </Page>
  );
}
