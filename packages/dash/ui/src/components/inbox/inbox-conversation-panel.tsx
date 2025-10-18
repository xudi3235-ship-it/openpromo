import type { InboxConversationSummary } from "@shared/inbox";
import { useInboxStore } from "@/stores/inbox-store";
import { InboxConversationHeader } from "./inbox-conversation-header";
import { InboxEmptyState } from "./inbox-empty-state";
import { InboxMessageInput } from "./inbox-message-input";
import { InboxMessageThread } from "./inbox-message-thread";

interface InboxConversationPanelProps {
  isLoading: boolean;
  isFetching: boolean;
}

export function InboxConversationPanel({
  isLoading,
  isFetching,
}: InboxConversationPanelProps) {
  const conversationMap = useInboxStore((state) => state.byId);
  const threads = useInboxStore((state) => state.threads);
  const currentConversationId = useInboxStore(
    (state) => state.currentConversationId,
  );

  const activeConversation = currentConversationId
    ? (conversationMap[currentConversationId] as
        | InboxConversationSummary
        | undefined)
    : null;
  const activeThread = currentConversationId
    ? threads[currentConversationId]
    : undefined;
  const activeMessages = activeThread?.items ?? [];
  const threadIsFetching = activeThread?.isFetching ?? false;
  const hasMessages = activeMessages.length > 0;
  const showLoading = isLoading || (threadIsFetching && !hasMessages);
  const showRefreshing = isFetching || threadIsFetching;

  return (
    <section className="flex flex-1 flex-col rounded-xl border border-border/60 bg-background">
      {activeConversation ? (
        <>
          <InboxConversationHeader conversation={activeConversation} />
          <InboxMessageThread
            messages={activeMessages}
            isLoading={showLoading}
            isRefreshing={showRefreshing && hasMessages}
          />
          <InboxMessageInput />
        </>
      ) : (
        <InboxEmptyState />
      )}
    </section>
  );
}
