import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@openpromo/ui/components/avatar";
import { Button } from "@openpromo/ui/components/button";
import { ScrollArea, ScrollBar } from "@openpromo/ui/components/scroll-area";
import { Skeleton } from "@openpromo/ui/components/skeleton";
import { cn } from "@openpromo/ui/lib/utils";
import type { InboxConversationSummary } from "@shared/inbox";
import { Link, useParams } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import { CornerDownRight, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useIntersectionObserver } from "usehooks-ts";
import { PlatformAvatarBadge } from "@/components/shared/platform-avatar-badge";
import { useInboxStore } from "@/stores/inbox-store";

interface InboxConversationListProps {
  conversations: InboxConversationSummary[];
  isLoading?: boolean;
  hasNextPage?: boolean;
  fetchNextPage?: () => void;
  isFetchingNextPage?: boolean;
}

export function InboxConversationList({
  conversations,
  isLoading = false,
  hasNextPage,
  fetchNextPage,
  isFetchingNextPage,
}: InboxConversationListProps) {
  const { workspaceSlug, conversationId: selectedConversationId } = useParams({
    strict: false,
  });
  const threads = useInboxStore((state) => state.threads);

  const { ref: loadMoreRef, isIntersecting } = useIntersectionObserver({
    threshold: 0.1,
    rootMargin: "100px",
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies: fetchNextPage is stable
  useEffect(() => {
    if (isIntersecting && hasNextPage && !isFetchingNextPage) {
      fetchNextPage?.();
    }
  }, [isIntersecting, hasNextPage, isFetchingNextPage]);

  return (
    <ScrollArea className="flex-1">
      <ul className="space-y-1 p-2">
        {isLoading &&
          Array.from({ length: 8 }).map((_, idx) => (
            <li
              key={`skeleton-${
                // biome-ignore lint/suspicious/noArrayIndexKey: ok
                idx
              }`}
            >
              <div className="w-full rounded-md border border-transparent p-2">
                <div className="flex items-start gap-2">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-2.5 w-1/2" />
                    <Skeleton className="h-2 w-3/4" />
                  </div>
                </div>
              </div>
            </li>
          ))}

        {!isLoading &&
          conversations.map((conversation) => {
            const thread = threads[conversation.id];
            const lastMessage = thread?.items[thread.items.length - 1] ?? null;
            const previewText =
              lastMessage?.text ??
              (lastMessage?.attachments?.length
                ? `${lastMessage.attachments.length} attachment${
                    lastMessage.attachments.length > 1 ? "s" : ""
                  }`
                : "No messages yet");
            const previewTime =
              lastMessage?.createdAt ?? conversation.lastMessageAt;
            const isSelected = selectedConversationId === conversation.id;

            return (
              <li key={conversation.id}>
                <ConversationListItem
                  conversation={conversation}
                  previewText={previewText}
                  previewTime={previewTime}
                  isSelected={isSelected}
                  workspaceSlug={workspaceSlug}
                />
              </li>
            );
          })}
        {!isLoading && conversations.length === 0 && (
          <li className="rounded-md border border-dashed border-border/60 bg-muted/10 p-6 text-center text-sm text-muted-foreground">
            No conversations match the current filters.
          </li>
        )}

        {/* Load More Trigger */}
        {hasNextPage && (
          <li ref={loadMoreRef} className="py-2">
            {isFetchingNextPage && (
              <div className="flex justify-center">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}
          </li>
        )}
      </ul>
      <ScrollBar orientation="vertical" />
    </ScrollArea>
  );
}

function ConversationListItem({
  conversation,
  previewText,
  previewTime,
  isSelected,
  workspaceSlug,
}: {
  conversation: InboxConversationSummary;
  previewText: string;
  previewTime: Date;
  isSelected: boolean;
  workspaceSlug: string | undefined;
}) {
  const [showQuickReply, setShowQuickReply] = useState(false);
  const [quickReplyText, setQuickReplyText] = useState("");

  const handleQuickReply = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowQuickReply(!showQuickReply);
  };

  const handleSendQuickReply = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!quickReplyText.trim()) return;

    // TODO: Implement quick reply API call
    // Will send message without opening the conversation
    setQuickReplyText("");
    setShowQuickReply(false);
  };

  return (
    <div className="group relative">
      <Link
        to="/workspaces/$workspaceSlug/inbox/$conversationId"
        params={{
          workspaceSlug: workspaceSlug ?? "",
          conversationId: conversation.id,
        }}
        search={(prev) => prev}
        className={cn(
          "block w-full rounded-md border border-transparent p-2 text-left transition-colors",
          isSelected
            ? "border-primary/10 bg-primary/5"
            : "hover:border-border/60 hover:bg-muted/15",
        )}
      >
        <div className="flex items-start gap-2">
          <div className="relative flex-shrink-0">
            <Avatar className="h-8 w-8">
              {conversation.contact.profilePicUrl ? (
                <AvatarImage
                  src={conversation.contact.profilePicUrl}
                  alt={conversation.contact.name}
                />
              ) : (
                <AvatarFallback>
                  {getInitials(conversation.contact.name)}
                </AvatarFallback>
              )}
            </Avatar>
            <PlatformAvatarBadge
              platform={conversation.platform}
              className="h-3.5 w-3.5"
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-1.5">
              <span className="truncate text-xs font-medium">
                {conversation.contact.name}
              </span>
              <span className="flex-shrink-0 text-[10px] text-muted-foreground">
                {formatDistanceToNow(previewTime, {
                  addSuffix: false,
                })}
              </span>
            </div>
            <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-muted-foreground">
              {previewText}
            </p>
          </div>
        </div>
      </Link>

      {/* Quick reply button - shows on hover */}
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={handleQuickReply}
        className={cn(
          "absolute right-1 top-1 h-6 w-6 rounded-md p-0 opacity-0 transition-opacity group-hover:opacity-100",
          showQuickReply && "opacity-100",
        )}
      >
        <CornerDownRight className="h-3 w-3" />
      </Button>

      {/* Quick reply input */}
      {showQuickReply && (
        <form
          onSubmit={handleSendQuickReply}
          className="border-t border-border/60 px-2 pb-2 pt-1"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="text"
            value={quickReplyText}
            onChange={(e) => setQuickReplyText(e.target.value)}
            placeholder="Quick reply..."
            className="h-7 w-full rounded-md border border-border/60 bg-background px-2 text-xs focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/20"
            autoFocus
          />
        </form>
      )}
    </div>
  );
}

function getInitials(name: string) {
  const [first = "", second = ""] = name.split(" ");
  return `${first.charAt(0)}${second.charAt(0)}`.toUpperCase();
}
