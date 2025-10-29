import type { InboxConversationSummary, InboxMessage } from "@shared/inbox";
import { InboxMessageInput } from "../inbox-message-input";
import { InboxMessageThread } from "../inbox-message-thread";

interface InboxDMPanelV2Props {
  workspaceSlug: string | undefined;
  conversation: InboxConversationSummary;
  messages: InboxMessage[];
  isLoading: boolean;
  isRefreshing: boolean;
}

export function InboxDMPanelV2({
  workspaceSlug,
  conversation,
  messages,
  isLoading,
  isRefreshing,
}: InboxDMPanelV2Props) {
  const hasMessages = messages.length > 0;
  const contactName = conversation.contact.name;
  const contactAvatarUrl = conversation.contact.profilePicUrl;
  const selfName = conversation.connectedAccount.accountName ?? "You";
  const selfAvatarUrl =
    conversation.connectedAccount.profilePicUrl ?? undefined;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <InboxMessageThread
          messages={messages}
          isLoading={isLoading}
          isRefreshing={isRefreshing && hasMessages}
          contactName={contactName}
          contactAvatarUrl={contactAvatarUrl}
          selfName={selfName}
          selfAvatarUrl={selfAvatarUrl}
        />
      </div>
      <InboxMessageInput
        workspaceSlug={workspaceSlug}
        conversation={conversation}
      />
    </div>
  );
}
