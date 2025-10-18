import { ScrollArea, ScrollBar } from "@openpromo/ui/components/scroll-area";
import { Skeleton } from "@openpromo/ui/components/skeleton";
import { cn } from "@openpromo/ui/lib/utils";
import { format } from "date-fns";
import { Loader2, Paperclip } from "lucide-react";
import type { InboxMessage } from "@/stores/inbox/types";

interface InboxMessageThreadProps {
  messages: InboxMessage[];
  isLoading?: boolean;
  isRefreshing?: boolean;
}

export function InboxMessageThread({
  messages,
  isLoading = false,
  isRefreshing = false,
}: InboxMessageThreadProps) {
  const showEmptyState = !isLoading && messages.length === 0;

  return (
    <ScrollArea className="flex-1 px-6 py-6">
      <div className="space-y-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, idx) => (
              <MessageSkeleton
                key={`message-skeleton-${
                  // biome-ignore lint/suspicious/noArrayIndexKey: ok
                  idx
                }`}
                isSelf={idx % 2 === 0}
              />
            ))
          : messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}

        {showEmptyState && (
          <div className="rounded-lg border border-dashed border-border/70 bg-muted/20 p-8 text-center text-sm text-muted-foreground">
            No messages yet. Messages will appear here when fetched from the
            platform.
          </div>
        )}

        {!isLoading && isRefreshing && (
          <div className="flex items-center justify-center gap-2 pt-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            Syncing latest messages…
          </div>
        )}
      </div>
      <ScrollBar orientation="vertical" />
    </ScrollArea>
  );
}

interface MessageBubbleProps {
  message: InboxMessage;
}

function MessageBubble({ message }: MessageBubbleProps) {
  const isSelf = message.sender === "self";
  const timestamp = format(message.createdAt, "MMM d, h:mm a");
  const hasAttachments = message.attachments?.length
    ? message.attachments.length > 0
    : false;

  return (
    <div
      className={cn(
        "flex w-full gap-3",
        isSelf ? "justify-end" : "justify-start",
      )}
    >
      <div
        className={cn(
          "max-w-[72%] rounded-lg border px-4 py-3 text-sm transition-colors",
          isSelf
            ? "border-primary/30 bg-primary/10 text-foreground"
            : "border-border/60 bg-background text-foreground",
        )}
      >
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="text-muted-foreground">
            {isSelf ? "You" : "Customer"}
          </span>
          <span className="text-muted-foreground">{timestamp}</span>
        </div>
        {message.text && (
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
            {message.text}
          </p>
        )}
        {hasAttachments && (
          <div className="mt-3 flex items-center gap-2 text-xs">
            <Paperclip className="h-3 w-3" />
            <span>
              {message.attachments.length} attachment
              {message.attachments.length > 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function MessageSkeleton({ isSelf }: { isSelf: boolean }) {
  return (
    <div
      className={cn(
        "flex w-full gap-3",
        isSelf ? "justify-end" : "justify-start",
      )}
    >
      <div
        className={cn(
          "max-w-[72%] rounded-lg border px-4 py-3",
          isSelf
            ? "border-primary/30 bg-primary/10"
            : "border-border/60 bg-muted/10",
        )}
      >
        <div className="space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-48" />
          <Skeleton className="h-3 w-36" />
        </div>
      </div>
    </div>
  );
}
