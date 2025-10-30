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
  isConversationLoading: boolean;
  hasNextPage?: boolean;
  fetchNextPage?: () => void;
  isFetchingNextPage?: boolean;
}

export function InboxConversationPanelV2({
  workspaceSlug,
  conversationId,
  conversation,
  isLoading,
  isFetching,
  isConversationLoading,
  hasNextPage,
  fetchNextPage,
  isFetchingNextPage,
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
              hasNextPage={hasNextPage}
              fetchNextPage={fetchNextPage}
              isFetchingNextPage={isFetchingNextPage}
            />
          ) : (
            <InboxCommentPanelV2
              workspaceSlug={workspaceSlug}
              conversation={conversation}
              messages={activeMessages}
              isLoading={showLoading}
              isFetching={showRefreshing}
              hasNextPage={hasNextPage}
              fetchNextPage={fetchNextPage}
              isFetchingNextPage={isFetchingNextPage}
            />
          )}
        </>
      ) : isConversationLoading ? (
        <div className="flex flex-1 items-center justify-center px-6 text-sm text-muted-foreground">
          Loading conversation…
        </div>
      ) : (
        <InboxEmptyState />
      )}
    </section>
  );
}
