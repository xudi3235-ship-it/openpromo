import type { InboxConversationSummary } from "@shared/inbox";
import { InboxCommentContext } from "../inbox-context-panel/inbox-comment-context";
import { InboxDMContext } from "../inbox-context-panel/inbox-dm-context";

interface InboxContextPanelV2Props {
  conversation: InboxConversationSummary | null;
}

export function InboxContextPanelV2({
  conversation,
}: InboxContextPanelV2Props) {
  if (!conversation) {
    return (
      <aside className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border/60 bg-background">
        <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-muted-foreground">
          Select a conversation to view details
        </div>
      </aside>
    );
  }

  return (
    <aside className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border/60 bg-background">
      {conversation.channel === "post_comment" ? (
        <InboxCommentContext conversation={conversation} />
      ) : (
        <InboxDMContext conversation={conversation} />
      )}
    </aside>
  );
}
