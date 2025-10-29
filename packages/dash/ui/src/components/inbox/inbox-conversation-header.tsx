import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@openpromo/ui/components/avatar";
import { Badge } from "@openpromo/ui/components/badge";
import { cn } from "@openpromo/ui/lib/utils";
import type { InboxConversationSummary } from "@shared/inbox";
import { formatDistanceToNow } from "date-fns";
import { getPlatformMeta } from "@/components/composer/utils/platform-style";

interface InboxConversationHeaderProps {
  conversation: InboxConversationSummary;
}

export function InboxConversationHeader({
  conversation,
}: InboxConversationHeaderProps) {
  const platformMeta = getPlatformMeta(conversation.platform);

  return (
    <header className="flex items-center justify-between gap-3 border-b border-border/60 px-5 py-3">
      <div className="flex items-center gap-3">
        <Avatar className="h-9 w-9 border border-border/60">
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
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <span>{conversation.contact.name}</span>
            <Badge
              variant="outline"
              className={cn(
                "hidden items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium lg:inline-flex",
                platformMeta.accentTextClass,
              )}
            >
              {platformMeta.icon && <platformMeta.icon className="h-3 w-3" />}
              {platformMeta.label}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="truncate">
              {conversation.connectedAccount.accountName ?? "Connected account"}
            </span>
            <span className="hidden text-muted-foreground/70 sm:inline">•</span>
            <span className="capitalize text-muted-foreground/80">
              {conversation.channel === "dm"
                ? "Direct message"
                : "Post comment"}
            </span>
          </div>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
        <span>Last activity</span>
        <span className="font-medium text-foreground">
          {formatDistanceToNow(conversation.lastMessageAt, {
            addSuffix: true,
          })}
        </span>
      </div>
    </header>
  );
}

function getInitials(name: string) {
  const [first = "", second = ""] = name.split(" ");
  return `${first.charAt(0)}${second.charAt(0)}`.toUpperCase();
}
