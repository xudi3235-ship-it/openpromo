import { Badge } from "@openpromo/ui/components/badge";
import type { InboxConversationSummary, InboxMessage } from "@shared/inbox";
import { format } from "date-fns";
import { Fragment, useMemo } from "react";
import { InboxMessageInput } from "./inbox-message-input";

interface InboxCommentPanelProps {
  workspaceSlug: string | undefined;
  conversation: InboxConversationSummary;
  messages: InboxMessage[];
  isLoading: boolean;
  isFetching: boolean;
}

export function InboxCommentPanel({
  workspaceSlug,
  conversation,
  messages,
  isLoading,
  isFetching,
}: InboxCommentPanelProps) {
  const { postMeta, threadItems } = useMemo(() => {
    const aggregatedPost: Record<string, unknown> = {};
    const items = messages.map((message) => {
      const channelMeta =
        message.metadata?.byPlatform?.[conversation.platform]?.post_comment;
      const extra = channelMeta?.extra ?? {};
      const post = extra.post;
      if (post && typeof post === "object") {
        Object.assign(aggregatedPost, post as Record<string, unknown>);
      }
      return message;
    });
    return { postMeta: aggregatedPost, threadItems: items };
  }, [conversation.platform, messages]);

  const previewUrl =
    (typeof postMeta.mediaThumbnailUrl === "string"
      ? postMeta.mediaThumbnailUrl
      : undefined) ??
    (typeof postMeta.mediaUrl === "string" ? postMeta.mediaUrl : undefined);
  const postCaption =
    typeof postMeta.caption === "string" ? postMeta.caption : undefined;
  const postPermalink =
    typeof postMeta.permalink === "string" ? postMeta.permalink : undefined;
  const mediaType =
    typeof postMeta.mediaType === "string" ? postMeta.mediaType : undefined;

  return (
    <div className="flex flex-1 flex-col">
      <section className="border-b border-border/60 px-6 py-4">
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
        {previewUrl || postCaption || postPermalink ? (
          <div className="mt-4 space-y-3 text-sm text-muted-foreground">
            {previewUrl ? (
              <div className="overflow-hidden rounded-md border border-border/60 bg-muted/20">
                <img
                  src={previewUrl}
                  alt="Post preview"
                  className="h-48 w-full object-cover"
                />
              </div>
            ) : null}
            {postCaption ? (
              <p className="text-sm text-foreground line-clamp-4">
                {postCaption}
              </p>
            ) : null}
            <div className="flex flex-wrap items-center gap-3 text-xs">
              {mediaType ? (
                <Badge variant="outline" className="capitalize">
                  {mediaType.toLowerCase()}
                </Badge>
              ) : null}
              {postPermalink ? (
                <a
                  className="text-primary"
                  href={postPermalink}
                  target="_blank"
                  rel="noreferrer"
                >
                  View post
                </a>
              ) : null}
            </div>
          </div>
        ) : null}
      </section>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Loading comments…</div>
        ) : (
          <ul className="space-y-3">
            {threadItems.map((message) => {
              const isDeleted = Boolean(message.metadata?.deleted);
              const actor = message.sender === "self" ? "You" : "Customer";
              return (
                <Fragment key={message.id}>
                  <li className="rounded-lg border border-border/60 bg-background px-4 py-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{actor}</span>
                      <span>{format(message.createdAt, "MMM d, h:mm a")}</span>
                    </div>
                    {isDeleted ? (
                      <p className="mt-2 text-sm italic text-muted-foreground">
                        Comment removed
                      </p>
                    ) : message.text ? (
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
                        {message.text}
                      </p>
                    ) : null}
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

      <div className="border-t border-border/60 px-6 py-4">
        <InboxMessageInput
          workspaceSlug={workspaceSlug}
          conversation={conversation}
        />
      </div>
    </div>
  );
}
