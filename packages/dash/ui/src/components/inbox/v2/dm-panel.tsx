import type { InboxConversationSummary, InboxMessage } from "@shared/inbox";
import { useCallback } from "react";
import { useInboxStore } from "@/stores/inbox-store";
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
  const setComposerReplyTarget = useInboxStore(
    (state) => state.setComposerReplyTarget,
  );
  const conversationId = conversation.id;
  const hasMessages = messages.length > 0;
  const contactName = conversation.contact.name;
  const contactAvatarUrl = conversation.contact.profilePicUrl;
  const selfName = conversation.connectedAccount.accountName ?? "You";
  const selfAvatarUrl =
    conversation.connectedAccount.profilePicUrl ?? undefined;
  const handleReply = useCallback(
    (message: InboxMessage) => {
      setComposerReplyTarget(conversationId, message.id);
    },
    [conversationId, setComposerReplyTarget],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <InboxMessageThread
          messages={messages}
          isLoading={isLoading}
          isRefreshing={isRefreshing && hasMessages}
          contactName={contactName}
          contactAvatarUrl={contactAvatarUrl}
          selfName={selfName}
          selfAvatarUrl={selfAvatarUrl}
          onReply={handleReply}
        />
      </div>
      <InboxMessageInput
        workspaceSlug={workspaceSlug}
        conversation={conversation}
      />
    </div>
  );
}
