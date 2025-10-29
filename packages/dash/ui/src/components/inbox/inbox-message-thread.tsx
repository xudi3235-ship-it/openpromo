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
          ? [true, false, true].map((isSelf, idx) => (
              <MessageSkeleton
                // biome-ignore lint/suspicious/noArrayIndexKey: loading state only
                key={`skeleton-${idx}`}
                isSelf={isSelf}
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
  const isOptimistic = Boolean(message.metadata?.optimistic);
  const isDeleted = Boolean(message.metadata?.deleted);
  const isEdited = Boolean(message.metadata?.edit);
  const reactions = Object.values(message.metadata?.byPlatform ?? {}).flatMap(
    (platformMeta) => platformMeta?.[message.channel]?.reactions ?? [],
  );
  const reactionMap = reactions.reduce((acc, reaction) => {
    const label = reaction.emoji ?? reaction.key.toLowerCase();
    const existing = acc.get(label) ?? { label, count: 0 };
    acc.set(label, { label, count: existing.count + 1 });
    return acc;
  }, new Map<string, { label: string; count: number }>());
  const reactionChips = Array.from(reactionMap.values());

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
            ? "border-primary/10 bg-primary/3 text-foreground"
            : "border-border/60 bg-background text-foreground",
          isOptimistic && "opacity-80",
          isDeleted && "border-dashed bg-muted/20 text-muted-foreground",
        )}
      >
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="text-muted-foreground">
            {isSelf ? "You" : "Customer"}
          </span>
          <span className="flex items-center gap-2 text-muted-foreground">
            {isOptimistic && <Loader2 className="h-3 w-3 animate-spin" />}
            {timestamp}
          </span>
        </div>
        {isDeleted ? (
          <p className="mt-2 whitespace-pre-wrap text-sm italic leading-relaxed">
            Message deleted
          </p>
        ) : (
          message.text && (
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
              {message.text}
            </p>
          )
        )}
        {isEdited && !isDeleted && (
          <div className="mt-2 text-xs text-muted-foreground">Edited</div>
        )}
        {!isDeleted && hasAttachments && (
          <div className="mt-3 flex items-center gap-2 text-xs">
            <Paperclip className="h-3 w-3" />
            <span>
              {message.attachments.length} attachment
              {message.attachments.length > 1 ? "s" : ""}
            </span>
          </div>
        )}
        {!isDeleted && reactionChips.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
            {reactionChips.map((chip) => (
              <span
                key={`${chip.label}-${message.id}`}
                className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1"
              >
                <span>{chip.label}</span>
                {chip.count > 1 && <span>{chip.count}</span>}
              </span>
            ))}
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
      <div className="max-w-[72%] space-y-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-4 w-48" />
      </div>
    </div>
  );
}
