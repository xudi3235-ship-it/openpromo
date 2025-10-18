import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@openpromo/ui/components/avatar";
import { Badge } from "@openpromo/ui/components/badge";
import { Button } from "@openpromo/ui/components/button";
import type { InboxConversationSummary } from "@shared/inbox";
import { formatDistanceToNow } from "date-fns";
import { Sparkles, Tag } from "lucide-react";

interface InboxConversationHeaderProps {
  conversation: InboxConversationSummary;
}

export function InboxConversationHeader({
  conversation,
}: InboxConversationHeaderProps) {
  return (
    <header className="flex items-start justify-between gap-4 border-b border-border/60 px-6 py-4">
      <div className="flex items-start gap-3">
        <Avatar className="h-12 w-12">
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
        <div>
          <h2 className="font-semibold">{conversation.contact.name}</h2>
          <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
            <Badge variant="outline">
              {conversation.connectedAccount.accountName ?? "Connected account"}
            </Badge>
            <Badge variant="secondary" className="capitalize">
              {conversation.channel === "dm"
                ? "Direct message"
                : "Post comment"}
            </Badge>
            <span>
              Last activity{" "}
              {formatDistanceToNow(conversation.lastMessageAt, {
                addSuffix: true,
              })}
            </span>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm">
          <Tag className="mr-2 h-4 w-4" />
          Add label
        </Button>
        <Button variant="outline" size="sm">
          <Sparkles className="mr-2 h-4 w-4" />
          Summarize
        </Button>
      </div>
    </header>
  );
}

function getInitials(name: string) {
  const [first = "", second = ""] = name.split(" ");
  return `${first.charAt(0)}${second.charAt(0)}`.toUpperCase();
}
