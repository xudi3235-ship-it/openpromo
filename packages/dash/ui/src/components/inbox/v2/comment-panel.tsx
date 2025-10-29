import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@openpromo/ui/components/avatar";
import { Badge } from "@openpromo/ui/components/badge";
import type { InboxConversationSummary, InboxMessage } from "@shared/inbox";
import { format } from "date-fns";
import { Fragment } from "react";
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
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <section className="flex-shrink-0 border-b border-border/60 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Post comment thread
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {conversation.connectedAccount.accountName ??
                "Facebook/Instagram"}
              {" • "}
              {format(conversation.lastMessageAt, "MMM d, h:mm a")}
            </p>
          </div>
          <Badge variant="outline" className="capitalize">
            {conversation.platform.toLowerCase()}
          </Badge>
        </div>
      </section>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Loading comments…</div>
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
                ? undefined
                : (getStringExtra(extra, "senderAvatarUrl") ??
                  conversation.contact.profilePicUrl ??
                  undefined);
              return (
                <Fragment key={message.id}>
                  <li className="flex items-start gap-3">
                    <Avatar className="h-8 w-8 border border-border/70 bg-background shadow-sm">
                      {avatarUrl ? (
                        <AvatarImage src={avatarUrl} alt={actorName} />
                      ) : null}
                      <AvatarFallback>{getInitials(actorName)}</AvatarFallback>
                    </Avatar>
                    <div className="flex min-w-0 max-w-[82%] flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">
                          {actorName}
                        </span>
                        <span>
                          {format(message.createdAt, "MMM d, h:mm a")}
                        </span>
                      </div>
                      <div className="w-fit rounded-2xl border border-border/60 bg-background px-3 py-2 text-sm leading-relaxed">
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
                    </div>
                  </li>
                </Fragment>
              );
            })}
          </ul>
        )}
        {isFetching && !isLoading && (
          <div className="mt-4 text-xs text-muted-foreground">
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
