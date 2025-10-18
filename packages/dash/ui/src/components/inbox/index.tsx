import type { InboxConversationSummary } from "@shared/inbox";
import { useEffect, useMemo } from "react";
import { Main } from "@/components/layout/main";
import { Route } from "@/routes/_authenticated/workspaces/$workspaceSlug/inbox";
import { useInboxStore } from "@/stores/inbox-store";
import { InboxConversationPanel } from "./inbox-conversation-panel";
import { InboxSidebar } from "./inbox-sidebar";

export function Inbox() {
  const { workspaceSlug } = Route.useParams();

  const initialize = useInboxStore((state) => state.initialize);
  const search = useInboxStore((state) => state.search);
  const selectedPlatform = useInboxStore((state) => state.selectedPlatform);
  const selectedChannel = useInboxStore((state) => state.selectedChannel);
  const conversationOrder = useInboxStore((state) => state.order);
  const conversationMap = useInboxStore((state) => state.byId);

  useEffect(() => {
    initialize(workspaceSlug);
  }, [workspaceSlug, initialize]);

  const conversations = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();
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
