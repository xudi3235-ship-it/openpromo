import type { InboxConversationSummary } from "@shared/inbox";
import { useEffect, useMemo } from "react";
import { Main } from "@/components/layout/main";
import { useInboxConversationsQuery } from "@/queries/inbox/conversations";
import { useInboxMessagesQuery } from "@/queries/inbox/messages";
import { Route } from "@/routes/_authenticated/workspaces/$workspaceSlug/inbox";
import { useInboxStore } from "@/stores/inbox-store";
import { InboxConversationPanel } from "./inbox-conversation-panel";
import { InboxSidebar } from "./inbox-sidebar";

export function Inbox() {
  const { workspaceSlug } = Route.useParams();

  const initialize = useInboxStore((state) => state.initialize);
  const setConversations = useInboxStore((state) => state.setConversations);
  const setMessages = useInboxStore((state) => state.setMessages);
  const search = useInboxStore((state) => state.search);
  const selectedPlatform = useInboxStore((state) => state.selectedPlatform);
  const selectedChannel = useInboxStore((state) => state.selectedChannel);
  const conversationOrder = useInboxStore((state) => state.order);
  const conversationMap = useInboxStore((state) => state.byId);
  const currentConversationId = useInboxStore(
    (state) => state.currentConversationId,
  );

  // Initialize store
  useEffect(() => {
    initialize(workspaceSlug);
  }, [workspaceSlug, initialize]);

  // Fetch conversations
  useInboxConversationsQuery(
    workspaceSlug,
    {
      page: 1,
      pageSize: 25,
      ...(search?.trim() && { q: search.trim() }),
      platform: selectedPlatform ?? undefined,
      channel: selectedChannel ?? undefined,
    },
    (data) => {
      // set conversations on success
      setConversations({
        conversations: data.items,
        pagination: {
          page: data.page,
          pageSize: data.pageSize,
          total: data.total,
          isFetching: false,
        },
        replace: true,
      });
    },
  );

  // Fetch messages for current conversation
  useInboxMessagesQuery(
    workspaceSlug,
    currentConversationId ?? undefined,
    {
      page: 1,
      pageSize: 50,
    },
    (data) => {
      // set messages on success
      setMessages({
        conversationId: currentConversationId ?? "",
        items: data.items,
        page: data.page,
        pageSize: data.pageSize,
        total: data.total,
        reset: true,
      });
    },
  );

  const conversations = useMemo(() => {
    const searchTerm = search?.trim().toLowerCase();
    return conversationOrder
      .map((id) => conversationMap[id])
      .filter((conversation): conversation is InboxConversationSummary =>
        Boolean(conversation),
      )
      .filter((conversation) => {
        if (selectedChannel && conversation.channel !== selectedChannel) {
          return false;
        }
        if (selectedPlatform && conversation.platform !== selectedPlatform) {
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
  }, [
    conversationOrder,
    conversationMap,
    selectedChannel,
    selectedPlatform,
    search,
  ]);

  return (
    <Main fixed>
      <div className="flex h-full min-h-[640px] gap-6">
        <InboxSidebar conversations={conversations} />
        <InboxConversationPanel />
      </div>
    </Main>
  );
}
