import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@openpromo/ui/components/avatar";
import { Badge } from "@openpromo/ui/components/badge";
import { ScrollArea, ScrollBar } from "@openpromo/ui/components/scroll-area";
import { Skeleton } from "@openpromo/ui/components/skeleton";
import { cn } from "@openpromo/ui/lib/utils";
import type { InboxConversationSummary } from "@shared/inbox";
import { formatDistanceToNow } from "date-fns";
import { PlatformAvatarBadge } from "@/components/shared/platform-avatar-badge";
import { Route } from "@/routes/_authenticated/workspaces/$workspaceSlug/inbox";
import { useInboxStore } from "@/stores/inbox-store";

interface InboxConversationListProps {
  conversations: InboxConversationSummary[];
  isLoading?: boolean;
}

export function InboxConversationList({
  conversations,
  isLoading = false,
}: InboxConversationListProps) {
  const navigate = Route.useNavigate();
  const searchParams = Route.useSearch();
  const selectedConversationId = searchParams.conversationId;
  const threads = useInboxStore((state) => state.threads);

  return (
    <ScrollArea className="flex-1">
      <ul className="space-y-1 p-3">
        {isLoading &&
          Array.from({ length: 6 }).map((_, idx) => (
            <li
              key={`skeleton-${
                // biome-ignore lint/suspicious/noArrayIndexKey: ok
                idx
              }`}
            >
              <div className="w-full rounded-lg border border-transparent p-3">
                <div className="flex items-start gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3 w-1/2" />
                    <div className="flex gap-2">
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-3 w-3/4" />
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
                <button
                  type="button"
                  onClick={() => {
                    navigate({
                      search: (prev) => ({
                        ...prev,
                        conversationId: conversation.id,
                      }),
                    });
                  }}
                  className={cn(
                    "w-full rounded-lg border border-transparent p-3 text-left transition-colors",
                    isSelected
                      ? "border-primary/10 bg-primary/3"
                      : "hover:border-border/70 hover:bg-muted/20",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="relative">
                      <Avatar className="h-10 w-10">
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
                      <PlatformAvatarBadge platform={conversation.platform} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="truncate text-sm font-medium">
                          {conversation.contact.name}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(previewTime, {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                        <Badge variant="outline" className="capitalize">
                          {conversation.channel === "dm"
                            ? "Direct message"
                            : "Post comment"}
                        </Badge>
                        <span>{conversation.connectedAccount.accountName}</span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {previewText}
                      </p>
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        {!isLoading && conversations.length === 0 && (
          <li className="rounded-md border border-dashed border-border/60 bg-muted/10 p-6 text-center text-sm text-muted-foreground">
            No conversations match the current filters.
          </li>
        )}
      </ul>
      <ScrollBar orientation="vertical" />
    </ScrollArea>
  );
}

function getInitials(name: string) {
  const [first = "", second = ""] = name.split(" ");
  return `${first.charAt(0)}${second.charAt(0)}`.toUpperCase();
}
