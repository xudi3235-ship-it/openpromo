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
  conversation,
  messages,
  isLoading,
  isRefreshing,
}: InboxDMPanelProps) {
  const hasMessages = messages.length > 0;
  const contactName = conversation.contact.name;
  const contactAvatarUrl = conversation.contact.profilePicUrl;
  const selfName = conversation.connectedAccount.accountName ?? "You";
  const selfAvatarUrl =
    conversation.connectedAccount.profilePicUrl ?? undefined;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <ScrollArea className="flex-1 px-6 py-6">
        <InboxMessageThread
          messages={messages}
          isLoading={isLoading}
          isRefreshing={isRefreshing && hasMessages}
          contactName={contactName}
          contactAvatarUrl={contactAvatarUrl}
          selfName={selfName}
          selfAvatarUrl={selfAvatarUrl}
          conversationPlatform={conversation.platform}
        />
        <ScrollBar orientation="vertical" />
      </ScrollArea>
      <div className="flex-shrink-0 border-t border-border/60 px-6 py-4">
        <InboxMessageInput conversation={conversation} />
      </div>
    </div>
  );
}
