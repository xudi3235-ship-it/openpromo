import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@openpromo/ui/components/avatar";
import { Skeleton } from "@openpromo/ui/components/skeleton";
import { cn } from "@openpromo/ui/lib/utils";
import { format } from "date-fns";
import { CornerUpLeft, Image as ImageIcon, Loader2 } from "lucide-react";
import { useMemo } from "react";
import type { InboxMessage } from "@/stores/inbox/types";
import { InboxMessageAttachments } from "./inbox-message-attachments";
import { processReactions, ReactionDisplay } from "./inbox-message-reactions";

interface InboxMessageThreadProps {
  messages: InboxMessage[];
  isLoading?: boolean;
  isRefreshing?: boolean;
  contactName: string;
  contactAvatarUrl?: string | null;
  selfName?: string;
  selfAvatarUrl?: string | null;
  onReply?: (message: InboxMessage) => void;
  conversationPlatform?: string; // Platform from conversation (FACEBOOK, INSTAGRAM, etc.)
}

export function InboxMessageThread({
  messages,
  isLoading = false,
  isRefreshing = false,
  contactName,
  contactAvatarUrl,
  selfName = "You",
  selfAvatarUrl,
  onReply,
  conversationPlatform,
}: InboxMessageThreadProps) {
  const showEmptyState = !isLoading && messages.length === 0;

  const messagesById = useMemo(() => {
    return messages.reduce(
      (acc, message) => {
        acc[message.id] = message;
        return acc;
      },
      {} as Record<string, InboxMessage>,
    );
  }, [messages]);

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
        : messages.map((message) => {
            const extra = message.metadata?.extra as
              | Record<string, unknown>
              | undefined;
            const replyToMessageId = getStringExtra(extra, "replyToMessageId");
            const replyTarget = replyToMessageId
              ? messagesById[replyToMessageId]
              : undefined;

            return (
              <MessageBubble
                key={message.id}
                message={message}
                replyTarget={replyTarget}
                contactName={contactName}
                contactAvatarUrl={contactAvatarUrl ?? undefined}
                selfName={selfName}
                selfAvatarUrl={selfAvatarUrl ?? undefined}
                onReply={onReply}
                conversationPlatform={conversationPlatform}
              />
            );
          })}

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
  replyTarget?: InboxMessage;
  contactName: string;
  contactAvatarUrl?: string;
  selfName: string;
  selfAvatarUrl?: string;
  onReply?: (message: InboxMessage) => void;
  conversationPlatform?: string; // Platform from conversation (FACEBOOK, INSTAGRAM, etc.)
}

function MessageBubble({
  message,
  replyTarget,
  contactName,
  contactAvatarUrl,
  selfName,
  selfAvatarUrl,
  onReply,
  conversationPlatform,
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

  // Instagram API doesn't support reply_to or sending reactions
  // Facebook API doesn't support sending reactions
  // So we disable both features for Instagram, and reactions for Facebook
  const canReply = conversationPlatform !== "INSTAGRAM"; // Instagram API doesn't support reply_to

  // Process reactions from webhooks (display only, no interaction)
  const processedReactions = processReactions(
    message.metadata,
    message.channel,
    undefined, // Don't highlight user reactions since interaction is disabled
  );

  const showReplyAction = typeof onReply === "function" && canReply;

  const replyTargetSender =
    replyTarget?.sender === "self"
      ? "You"
      : (getStringExtra(
          replyTarget?.metadata?.extra as Record<string, unknown>,
          "senderName",
        ) ??
        contactName ??
        "Customer");

  return (
    <div
      className={cn(
        "group flex w-full items-start gap-2",
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

        {replyTarget && !isDeleted && (
          <div
            className={cn(
              "mb-1 flex items-center gap-2 rounded-lg border border-l-4 border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground",
              isSelf ? "border-l-primary/40" : "border-l-muted-foreground/40",
            )}
          >
            <CornerUpLeft className="h-3 w-3 flex-shrink-0" />
            <div className="flex flex-col gap-0.5 overflow-hidden text-left">
              <span className="font-medium text-foreground">
                Reply to {replyTargetSender}
              </span>
              <span className="truncate">
                {replyTarget.attachments?.length > 0 ? (
                  <span className="flex items-center gap-1 italic">
                    <ImageIcon className="h-3 w-3" />
                    {replyTarget.attachments.length > 1
                      ? `${replyTarget.attachments.length} attachments`
                      : "Attachment"}
                  </span>
                ) : (
                  (replyTarget.text ?? "Message")
                )}
              </span>
            </div>
          </div>
        )}

        <div
          className={cn(
            "relative w-fit rounded-2xl border px-3 text-sm leading-relaxed",
            isSelf
              ? "border-primary/40 bg-primary/90 text-primary-foreground"
              : "border-border/60 bg-background text-foreground",
            isOptimistic && "opacity-85",
            isDeleted && "border-dashed bg-muted/30 text-muted-foreground",
            // Add bottom padding when reactions exist to accommodate overlap
            processedReactions.length > 0 && !isDeleted ? "pb-3" : "py-2",
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
            <InboxMessageAttachments attachments={message.attachments} />
          )}

          {/* Reactions Display (Read-only, from webhooks) - Positioned like native apps */}
          {!isDeleted && processedReactions.length > 0 && (
            <div
              className={cn(
                "absolute bottom-0 flex items-end gap-1",
                isSelf ? "right-2 translate-y-1/2" : "left-2 translate-y-1/2",
              )}
            >
              <ReactionDisplay reactions={processedReactions} />
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {showReplyAction && (
          <div
            className={cn(
              "flex items-center gap-2",
              isSelf ? "self-end" : "self-start",
            )}
          >
            <button
              type="button"
              onClick={() => onReply?.(message)}
              className={cn(
                "inline-flex items-center gap-1 text-[11px] text-muted-foreground/80 transition-opacity",
                "opacity-0 group-hover:opacity-100",
              )}
            >
              <CornerUpLeft className="h-3 w-3" />
              Reply
            </button>
          </div>
        )}
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
        "flex w-full items-start gap-2",
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
