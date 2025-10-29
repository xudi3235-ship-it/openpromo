import { ScrollArea, ScrollBar } from "@openpromo/ui/components/scroll-area";
import type { InboxConversationSummary, InboxMessage } from "@shared/inbox";
import { InboxMessageInput } from "./inbox-message-input";
import { InboxMessageThread } from "./inbox-message-thread";

interface InboxDMPanelProps {
  workspaceSlug: string | undefined;
  conversation: InboxConversationSummary;
  messages: InboxMessage[];
  isLoading: boolean;
  isRefreshing: boolean;
}

export function InboxDMPanel({
  workspaceSlug,
  conversation,
  messages,
  isLoading,
  isRefreshing,
}: InboxDMPanelProps) {
  const hasMessages = messages.length > 0;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <ScrollArea className="flex-1 px-6 py-6">
        <InboxMessageThread
          messages={messages}
          isLoading={isLoading}
          isRefreshing={isRefreshing && hasMessages}
        />
        <ScrollBar orientation="vertical" />
      </ScrollArea>
      <div className="flex-shrink-0 border-t border-border/60 px-6 py-4">
        <InboxMessageInput
          workspaceSlug={workspaceSlug}
          conversation={conversation}
        />
      </div>
    </div>
  );
}
