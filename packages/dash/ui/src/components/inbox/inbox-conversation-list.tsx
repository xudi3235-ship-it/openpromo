import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@openpromo/ui/components/avatar";
import { ListSkeleton, ListState } from "@openpromo/ui/components/list-state";
import { ScrollArea, ScrollBar } from "@openpromo/ui/components/scroll-area";
import { cn } from "@openpromo/ui/lib/utils";
import type { InboxConversationSummary } from "@shared/inbox";
import { Link, useParams } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import { Loader2, MessageCircle, MessageSquare } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";
import { useIntersectionObserver } from "usehooks-ts";
import { PlatformAvatarBadge } from "@/components/shared/platform-avatar-badge";
import { useQuickReply } from "@/hooks/inbox/use-quick-reply";
import {
  useMarkConversationRead,
  useMarkConversationUnread,
} from "@/queries/inbox/conversations";
import { useDeleteConversationOrpc } from "@/queries/inbox/delete-conversation";
import { Route } from "@/routes/_authenticated/workspaces/$workspaceSlug/inbox";
import { useInboxStore } from "@/stores/inbox-store";
import { ConversationActionsMenu } from "./conversation-actions-menu";

type InboxNavigate = ReturnType<typeof Route.useNavigate>;
type InboxSearchParams = ReturnType<typeof Route.useSearch>;
type MarkConversationMutationResult = {
  success: boolean;
  isUnread?: boolean;
  lastReadAt?: string | null;
};

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
  const navigate = Route.useNavigate();
  const searchParams = Route.useSearch();
  const threads = useInboxStore((state) => state.threads);
  const activeQuickReplyId = useInboxStore((state) => state.activeQuickReplyId);
  const setActiveQuickReply = useInboxStore(
    (state) => state.setActiveQuickReply,
  );

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
        {isLoading ? (
          <li>
            <ListSkeleton count={8} />
          </li>
        ) : (
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
                  navigate={navigate}
                  searchParams={searchParams}
                  showQuickReply={activeQuickReplyId === conversation.id}
                  onToggleQuickReply={(show) =>
                    setActiveQuickReply(show ? conversation.id : null)
                  }
                />
              </li>
            );
          })
        )}
        {!isLoading && conversations.length === 0 && (
          <li>
            <ListState
              size="sm"
              title="No conversations match the current filters."
              description="Adjust your filters or search to see more conversations."
            />
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
  navigate,
  searchParams,
  showQuickReply,
  onToggleQuickReply,
}: {
  conversation: InboxConversationSummary;
  previewText: string;
  previewTime: Date;
  isSelected: boolean;
  workspaceSlug: string | undefined;
  navigate: InboxNavigate;
  searchParams: InboxSearchParams;
  showQuickReply: boolean;
  onToggleQuickReply: (show: boolean) => void;
}) {
  const { text, setText, sendQuickReply, isSubmitting } = useQuickReply(
    workspaceSlug,
    conversation,
  );
  const markConversationRead = useMarkConversationRead(workspaceSlug);
  const markConversationUnread = useMarkConversationUnread(workspaceSlug);
  const deleteConversation = useDeleteConversationOrpc(workspaceSlug);
  const upsertConversation = useInboxStore((state) => state.upsertConversation);
  const removeConversation = useInboxStore((state) => state.removeConversation);
  const selectConversation = useInboxStore((state) => state.selectConversation);

  const unreadActionPending =
    markConversationRead.isPending || markConversationUnread.isPending;
  const deletePending = deleteConversation.isPending;

  const handleQuickReply = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onToggleQuickReply(!showQuickReply);
  };

  const handleSendQuickReply = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!text.trim() || isSubmitting) return;

    await sendQuickReply(text);
  };

  const handleToggleUnread = async () => {
    if (!workspaceSlug || unreadActionPending) return;

    try {
      const mutation = conversation.isUnread
        ? markConversationRead
        : markConversationUnread;
      const data = (await mutation.mutateAsync(conversation.id)) as
        | MarkConversationMutationResult
        | undefined;

      const nextConversation = {
        ...(useInboxStore.getState().byId[conversation.id] ?? conversation),
        isUnread: data?.isUnread ?? !conversation.isUnread,
        lastReadAt: data?.lastReadAt ? new Date(data.lastReadAt) : null,
      } satisfies InboxConversationSummary;

      upsertConversation(nextConversation);

      toast.success(
        data?.isUnread
          ? "Conversation marked as unread"
          : "Conversation marked as read",
      );
    } catch (error) {
      toast.error("Failed to update conversation", {
        description:
          error instanceof Error ? error.message : "Please try again",
      });
    }
  };

  const handleDelete = async () => {
    if (!workspaceSlug || deletePending) return;

    try {
      await deleteConversation.mutateAsync({
        conversationId: conversation.id,
        workspaceSlug,
      });
      removeConversation(conversation.id);
      onToggleQuickReply(false);

      if (isSelected) {
        selectConversation(null);
        void navigate({
          to: "/workspaces/$workspaceSlug/inbox",
          params: { workspaceSlug },
          search: {
            ...searchParams,
            conversationId: undefined,
            highlightMessageId: undefined,
          },
        });
      }

      toast.success("Conversation deleted");
    } catch (error) {
      toast.error("Failed to delete conversation", {
        description:
          error instanceof Error ? error.message : "Please try again",
      });
    }
  };

  return (
    <div className="group relative">
      <Link
        to="/workspaces/$workspaceSlug/inbox/$conversationId"
        params={{
          workspaceSlug: workspaceSlug ?? "",
          conversationId: conversation.id,
        }}
        search={(prev) => ({
          channel: prev.channel as "dm" | "post_comment" | "all" | undefined,
          platform: prev.platform as
            | "FACEBOOK"
            | "INSTAGRAM"
            | "TIKTOK"
            | "all"
            | undefined,
          q: prev.q,
          unread: prev.unread,
        })}
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
            {conversation.isUnread && (
              <div className="absolute -left-1.5 top-0 h-2.5 w-2.5 rounded-full bg-blue-500" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <div className="flex min-w-0 items-baseline gap-1.5">
                <span
                  className={cn(
                    "truncate text-xs",
                    conversation.isUnread ? "font-semibold" : "font-medium",
                  )}
                >
                  {conversation.contact.name}
                </span>
                <div className="flex-shrink-0 text-muted-foreground">
                  {conversation.channel === "post_comment" ? (
                    <MessageSquare className="h-3 w-3" />
                  ) : (
                    <MessageCircle className="h-3 w-3" />
                  )}
                </div>
              </div>
              <span className="flex-shrink-0 text-[10px] text-muted-foreground transition-opacity group-hover:opacity-0">
                {formatDistanceToNow(previewTime, {
                  addSuffix: false,
                })}
              </span>
            </div>
            <p
              className={cn(
                "mt-0.5 line-clamp-2 text-[11px] leading-snug",
                conversation.isUnread
                  ? "font-medium text-foreground"
                  : "text-muted-foreground",
              )}
            >
              {previewText}
            </p>
          </div>
        </div>
      </Link>

      {/* Action buttons - shows on hover */}
      <div className="absolute right-1 top-1 opacity-0 transition-opacity group-hover:opacity-100">
        <ConversationActionsMenu
          onQuickReply={handleQuickReply}
          onToggleUnread={handleToggleUnread}
          isUnread={conversation.isUnread}
          unreadActionPending={unreadActionPending}
          onDelete={handleDelete}
          deletePending={deletePending}
        />
      </div>

      {/* Quick reply input */}
      {showQuickReply && (
        <form
          onSubmit={handleSendQuickReply}
          className="border-t border-border/60 px-2 pb-2 pt-2"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Quick reply..."
            disabled={isSubmitting}
            className="h-7 w-full rounded-md border border-border/60 bg-background px-2 text-xs focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/20 disabled:opacity-50"
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
