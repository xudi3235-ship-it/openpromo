import type { InboxConversationSummary } from "@shared/inbox";
import { useEffect, useRef } from "react";
import { useMarkConversationRead } from "@/queries/inbox/conversations";
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
  const { mutate: markAsReadMutate } = useMarkConversationRead(workspaceSlug);
  const markedAsReadRef = useRef<Set<string>>(new Set());

  const activeThread = conversationId ? threads[conversationId] : undefined;
  const activeMessages = activeThread?.items ?? [];
  const threadIsFetching = activeThread?.isFetching ?? false;
  const hasMessages = activeMessages.length > 0;
  const showLoading = isLoading || (threadIsFetching && !hasMessages);
  const showRefreshing = isFetching || threadIsFetching;

  // Mark as read when conversation is visible and has messages
  useEffect(() => {
    if (!conversation) return;
    if (!conversation.isUnread) return;
    if (!hasMessages) return; // Wait until messages are loaded
    if (showLoading) return; // Don't mark as read while loading
    if (markedAsReadRef.current.has(conversation.id)) return; // Already attempted

    // Mark as read and track that we attempted it (don't retry if it fails)
    markedAsReadRef.current.add(conversation.id);
    markAsReadMutate(conversation.id);
  }, [conversation, hasMessages, showLoading, markAsReadMutate]);

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
