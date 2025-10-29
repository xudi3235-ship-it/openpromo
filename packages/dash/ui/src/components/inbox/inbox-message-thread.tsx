import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@openpromo/ui/components/avatar";
import { Skeleton } from "@openpromo/ui/components/skeleton";
import { cn } from "@openpromo/ui/lib/utils";
import { format } from "date-fns";
import { Loader2, Paperclip } from "lucide-react";
import type { InboxMessage } from "@/stores/inbox/types";

interface InboxMessageThreadProps {
  messages: InboxMessage[];
  isLoading?: boolean;
  isRefreshing?: boolean;
  contactName: string;
  contactAvatarUrl?: string | null;
  selfName?: string;
  selfAvatarUrl?: string | null;
}

export function InboxMessageThread({
  messages,
  isLoading = false,
  isRefreshing = false,
  contactName,
  contactAvatarUrl,
  selfName = "You",
  selfAvatarUrl,
}: InboxMessageThreadProps) {
  const showEmptyState = !isLoading && messages.length === 0;

  return (
    <div className="space-y-3">
      {isLoading
        ? [true, false, true].map((isSelf, idx) => (
            <MessageSkeleton
              // biome-ignore lint/suspicious/noArrayIndexKey: loading state only
              key={`skeleton-${idx}`}
              isSelf={isSelf}
            />
          ))
        : messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              contactName={contactName}
              contactAvatarUrl={contactAvatarUrl ?? undefined}
              selfName={selfName}
              selfAvatarUrl={selfAvatarUrl ?? undefined}
            />
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
  );
}

interface MessageBubbleProps {
  message: InboxMessage;
  contactName: string;
  contactAvatarUrl?: string;
  selfName: string;
  selfAvatarUrl?: string;
}

function MessageBubble({
  message,
  contactName,
  contactAvatarUrl,
  selfName,
  selfAvatarUrl,
}: MessageBubbleProps) {
  const isSelf = message.sender === "self";
  const timestamp = format(message.createdAt, "MMM d, h:mm a");
  const hasAttachments = message.attachments?.length
    ? message.attachments.length > 0
    : false;
  const isOptimistic = Boolean(message.metadata?.optimistic);
  const isDeleted = Boolean(message.metadata?.deleted);
  const isEdited = Boolean(message.metadata?.edit);
  const extra = message.metadata?.extra as Record<string, unknown> | undefined;
  const senderNameExtra = getStringExtra(extra, "senderName");
  const senderAvatarExtra = getStringExtra(extra, "senderAvatarUrl");
  const displayName = isSelf
    ? selfName
    : (senderNameExtra ?? contactName ?? "Customer");
  const avatarUrl = isSelf
    ? (selfAvatarUrl ?? undefined)
    : (senderAvatarExtra ?? contactAvatarUrl ?? undefined);
  const avatarFallback = getInitials(displayName || (isSelf ? "You" : "User"));
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
        "flex w-full items-end gap-2",
        isSelf ? "justify-end" : "justify-start",
      )}
    >
      {!isSelf && <MessageAvatar src={avatarUrl} fallback={avatarFallback} />}
      <div
        className={cn(
          "flex max-w-[78%] flex-col gap-1",
          isSelf ? "items-end text-right" : "items-start text-left",
        )}
      >
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span className="font-medium text-foreground">{displayName}</span>
          <span className="flex items-center gap-1">
            {isOptimistic && <Loader2 className="h-3 w-3 animate-spin" />}
            {timestamp}
          </span>
        </div>
        <div
          className={cn(
            "w-fit rounded-2xl border px-3 py-2 text-sm leading-relaxed",
            isSelf
              ? "border-primary/40 bg-primary/90 text-primary-foreground"
              : "border-border/60 bg-background text-foreground",
            isOptimistic && "opacity-85",
            isDeleted && "border-dashed bg-muted/30 text-muted-foreground",
          )}
        >
          {isDeleted ? (
            <p className="text-sm italic">Message deleted</p>
          ) : message.text ? (
            <p className="whitespace-pre-wrap">{message.text}</p>
          ) : null}
          {isEdited && !isDeleted && (
            <div className="mt-1 text-[11px] text-muted-foreground/80">
              Edited
            </div>
          )}
          {!isDeleted && hasAttachments && (
            <div className="mt-2 flex items-center gap-2 text-xs">
              <Paperclip className="h-3 w-3" />
              <span>
                {message.attachments.length} attachment
                {message.attachments.length > 1 ? "s" : ""}
              </span>
            </div>
          )}
          {!isDeleted && reactionChips.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
              {reactionChips.map((chip) => (
                <span
                  key={`${chip.label}-${message.id}`}
                  className="inline-flex items-center gap-1 rounded-full bg-muted/60 px-2 py-1"
                >
                  <span>{chip.label}</span>
                  {chip.count > 1 && <span>{chip.count}</span>}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
      {isSelf && (
        <MessageAvatar src={avatarUrl} fallback={avatarFallback} self />
      )}
    </div>
  );
}

function MessageSkeleton({ isSelf }: { isSelf: boolean }) {
  return (
    <div
      className={cn(
        "flex w-full items-end gap-2",
        isSelf ? "justify-end" : "justify-start",
      )}
    >
      {!isSelf && <Skeleton className="h-8 w-8 rounded-full" />}
      <div className="max-w-[78%] space-y-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-4 w-56" />
        <Skeleton className="h-4 w-40" />
      </div>
      {isSelf && <Skeleton className="h-8 w-8 rounded-full" />}
    </div>
  );
}

function MessageAvatar({
  src,
  fallback,
  self = false,
}: {
  src?: string;
  fallback: string;
  self?: boolean;
}) {
  return (
    <Avatar
      className={cn(
        "h-8 w-8 border border-border/70 bg-background shadow-sm",
        self && "bg-primary/10",
      )}
    >
      {src ? <AvatarImage src={src} alt={fallback} /> : null}
      <AvatarFallback>{fallback}</AvatarFallback>
    </Avatar>
  );
}

function getInitials(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "?";
  const [first = "", second = ""] = trimmed.split(" ");
  return `${first.charAt(0)}${second.charAt(0)}`.toUpperCase();
}

function getStringExtra(
  extra: Record<string, unknown> | undefined,
  key: string,
) {
  if (!extra) return undefined;
  const raw = extra[key];
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}
