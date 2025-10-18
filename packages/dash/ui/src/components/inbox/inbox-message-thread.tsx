import { ScrollArea, ScrollBar } from "@openpromo/ui/components/scroll-area";
import { cn } from "@openpromo/ui/lib/utils";
import { format } from "date-fns";
import { Paperclip } from "lucide-react";
import type { InboxMessage } from "@/stores/inbox/types";

interface InboxMessageThreadProps {
  messages: InboxMessage[];
}

export function InboxMessageThread({ messages }: InboxMessageThreadProps) {
  return (
    <ScrollArea className="flex-1 px-6 py-6">
      <div className="space-y-4">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        {messages.length === 0 && (
          <div className="rounded-lg border border-dashed border-border/70 bg-muted/20 p-8 text-center text-sm text-muted-foreground">
            No messages yet. Messages will appear here when fetched from the
            platform.
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
            ? "border-primary/30 bg-primary/10 text-foreground"
            : "border-border/60 bg-background text-foreground",
        )}
      >
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="text-muted-foreground">
            {isSelf ? "You" : "Customer"}
          </span>
          <span className="text-muted-foreground">{timestamp}</span>
        </div>
        {message.text && (
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
            {message.text}
          </p>
        )}
        {hasAttachments && (
          <div className="mt-3 flex items-center gap-2 text-xs">
            <Paperclip className="h-3 w-3" />
            <span>
              {message.attachments.length} attachment
              {message.attachments.length > 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
