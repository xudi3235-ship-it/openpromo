import type { InboxConversationSummary } from "@shared/inbox";
import { useInboxStore } from "@/stores/inbox-store";
import { InboxConversationHeader } from "../inbox-conversation-header";
import { InboxEmptyState } from "../inbox-empty-state";
import { InboxCommentPanelV2 } from "./comment-panel";
import { InboxDMPanelV2 } from "./dm-panel";

interface InboxConversationPanelProps {
  workspaceSlug: string | undefined;
  conversationId: string | undefined;
  conversation: InboxConversationSummary | null;
  isLoading: boolean;
  isFetching: boolean;
}

export function InboxConversationPanelV2({
  workspaceSlug,
  conversationId,
  conversation,
  isLoading,
  isFetching,
}: InboxConversationPanelProps) {
  const threads = useInboxStore((state) => state.threads);

  const activeThread = conversationId ? threads[conversationId] : undefined;
  const activeMessages = activeThread?.items ?? [];
  const threadIsFetching = activeThread?.isFetching ?? false;
  const hasMessages = activeMessages.length > 0;
  const showLoading = isLoading || (threadIsFetching && !hasMessages);
  const showRefreshing = isFetching || threadIsFetching;

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border/60 bg-background">
      {conversation ? (
        <>
          <InboxConversationHeader conversation={conversation} />
          {conversation.channel === "dm" ? (
            <InboxDMPanelV2
              workspaceSlug={workspaceSlug}
              conversation={conversation}
              messages={activeMessages}
              isLoading={showLoading}
              isRefreshing={showRefreshing}
            />
          ) : (
            <InboxCommentPanelV2
              workspaceSlug={workspaceSlug}
              conversation={conversation}
              messages={activeMessages}
              isLoading={showLoading}
              isFetching={showRefreshing}
            />
          )}
        </>
      ) : (
        <InboxEmptyState />
      )}
    </section>
  );
}
