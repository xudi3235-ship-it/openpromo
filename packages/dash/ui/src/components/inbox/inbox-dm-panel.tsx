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
    <div className="flex flex-1 flex-col">
      <InboxMessageThread
        messages={messages}
        isLoading={isLoading}
        isRefreshing={isRefreshing && hasMessages}
      />
      <InboxMessageInput
        workspaceSlug={workspaceSlug}
        conversation={conversation}
      />
    </div>
  );
}
