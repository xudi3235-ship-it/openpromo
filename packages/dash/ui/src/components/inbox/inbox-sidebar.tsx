import type { InboxConversationSummary } from "@shared/inbox";
import { Loader2 } from "lucide-react";
import { InboxConversationList } from "./inbox-conversation-list";
import { InboxFilters } from "./inbox-filters";

interface InboxSidebarProps {
  conversations: InboxConversationSummary[];
  isLoading: boolean;
  isFetching: boolean;
}

export function InboxSidebar({
  conversations,
  isLoading,
  isFetching,
}: InboxSidebarProps) {
  return (
    <aside className="flex w-full max-w-sm flex-col overflow-hidden rounded-xl border border-border/60 bg-background sm:w-72 lg:w-80">
      <div className="space-y-3 border-b border-border/60 px-3 py-3">
        <InboxFilters />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{conversations.length} conversations</span>
          {isFetching && (
            <span className="inline-flex items-center gap-1 text-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> Syncing…
            </span>
          )}
        </div>
      </div>
      <InboxConversationList
        conversations={conversations}
        isLoading={isLoading}
      />
    </aside>
  );
}
