import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@openpromo/ui/components/avatar";
import type { InboxConversationSummary, InboxMessage } from "@shared/inbox";
import { format } from "date-fns";
import { CornerUpLeft } from "lucide-react";
import { Fragment, useCallback } from "react";
import { useInboxStore } from "@/stores/inbox-store";
import { InboxMessageInput } from "../inbox-message-input";

interface InboxCommentPanelV2Props {
  workspaceSlug: string | undefined;
  conversation: InboxConversationSummary;
  messages: InboxMessage[];
  isLoading: boolean;
  isFetching: boolean;
}

export function InboxCommentPanelV2({
  workspaceSlug,
  conversation,
  messages,
  isLoading,
  isFetching,
}: InboxCommentPanelV2Props) {
  const setComposerReplyTarget = useInboxStore(
    (state) => state.setComposerReplyTarget,
  );
  const conversationId = conversation.id;
  const handleReply = useCallback(
    (message: InboxMessage) => {
      setComposerReplyTarget(conversationId, message.id);
    },
    [conversationId, setComposerReplyTarget],
  );
  const connectedAccountAvatar =
    conversation.connectedAccount.profilePicUrl ?? undefined;
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <section className="flex-shrink-0 border-b border-border/60 px-4 py-2.5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-semibold text-foreground">
              Post comment thread
            </h3>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              {conversation.connectedAccount.accountName ??
                "Facebook/Instagram"}
              {" • "}
              {format(conversation.lastMessageAt, "MMM d, h:mm a")}
            </p>
          </div>
        </div>
      </section>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {isLoading ? (
          <div className="text-xs text-muted-foreground">Loading comments…</div>
        ) : (
          <ul className="space-y-2">
            {messages.map((message) => {
              const isDeleted = Boolean(message.metadata?.deleted);
              const isSelf = message.sender === "self";
              const extra = message.metadata?.extra as
                | Record<string, unknown>
                | undefined;
              const actorName = isSelf
                ? (conversation.connectedAccount.accountName ?? "You")
                : (getStringExtra(extra, "senderName") ??
                  conversation.contact.name);
              const avatarUrl = isSelf
                ? connectedAccountAvatar
                : (getStringExtra(extra, "senderAvatarUrl") ??
                  conversation.contact.profilePicUrl ??
                  undefined);
              return (
                <Fragment key={message.id}>
                  <li className="flex items-start gap-2">
                    <Avatar className="h-7 w-7 border border-border/70 bg-background shadow-sm">
                      {avatarUrl ? (
                        <AvatarImage src={avatarUrl} alt={actorName} />
                      ) : null}
                      <AvatarFallback>{getInitials(actorName)}</AvatarFallback>
                    </Avatar>
                    <div className="flex min-w-0 max-w-[82%] flex-col gap-0.5">
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                        <span className="font-medium text-foreground">
                          {actorName}
                        </span>
                        <span>
                          {format(message.createdAt, "MMM d, h:mm a")}
                        </span>
                      </div>
                      <div className="w-fit rounded-2xl border border-border/60 bg-background px-2.5 py-1.5 text-xs leading-relaxed">
                        {isDeleted ? (
                          <span className="italic text-muted-foreground">
                            Comment removed
                          </span>
                        ) : message.text ? (
                          <span className="whitespace-pre-wrap">
                            {message.text}
                          </span>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleReply(message)}
                        disabled={isDeleted}
                        className="inline-flex items-center gap-1 text-[10px] text-muted-foreground/80 hover:text-foreground disabled:pointer-events-none disabled:opacity-60"
                      >
                        <CornerUpLeft className="h-2.5 w-2.5" />
                        Reply
                      </button>
                    </div>
                  </li>
                </Fragment>
              );
            })}
          </ul>
        )}
        {isFetching && !isLoading && (
          <div className="mt-3 text-[10px] text-muted-foreground">
            Syncing latest comments…
          </div>
        )}
      </div>

      <InboxMessageInput
        workspaceSlug={workspaceSlug}
        conversation={conversation}
      />
    </div>
  );
}

function getInitials(name: string) {
  const [first = "", second = ""] = name.trim().split(" ");
  return `${first.charAt(0)}${second.charAt(0)}`.toUpperCase();
}

function getStringExtra(
  extra: Record<string, unknown> | undefined,
  key: string,
) {
  if (!extra) return undefined;
  const value = extra[key];
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}
