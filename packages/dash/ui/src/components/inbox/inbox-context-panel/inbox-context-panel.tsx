import type { InboxConversationSummary } from "@shared/inbox";
import { InboxCommentContext } from "./inbox-comment-context";
import { InboxDMContext } from "./inbox-dm-context";

interface InboxContextPanelProps {
  conversation: InboxConversationSummary | null;
}

export function InboxContextPanel({ conversation }: InboxContextPanelProps) {
  if (!conversation) {
    return (
      <aside className="hidden w-80 flex-col rounded-xl border border-border/60 bg-background lg:flex">
        <div className="flex h-full items-center justify-center p-8 text-center text-sm text-muted-foreground">
          Select a conversation to view details
        </div>
      </aside>
    );
  }

  return (
    <aside className="hidden w-80 flex-col rounded-xl border border-border/60 bg-background lg:flex">
      {conversation.channel === "post_comment" ? (
        <InboxCommentContext conversation={conversation} />
      ) : (
        <InboxDMContext conversation={conversation} />
      )}
    </aside>
  );
}
