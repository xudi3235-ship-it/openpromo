import { Badge } from "@openpromo/ui/components/badge";
import type { InboxConversationSummary } from "@shared/inbox";
import { Loader2, MessageSquare } from "lucide-react";
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
    <aside className="flex w-full max-w-md flex-col rounded-xl border border-border/60 bg-background sm:w-80 lg:w-96">
      <header className="rounded-t-xl border-b border-border/60 bg-muted/20 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">Inbox</h1>
            <p className="text-xs text-muted-foreground">
              Manage conversations across platforms
            </p>
          </div>
          <Badge
            variant="secondary"
            className="flex items-center gap-1 text-xs font-normal"
          >
            {isFetching ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <MessageSquare className="h-3 w-3" />
            )}
            {isFetching ? "Syncing…" : conversations.length}
          </Badge>
        </div>
        <div className="mt-3">
          <InboxFilters />
        </div>
      </header>
      <InboxConversationList
        conversations={conversations}
        isLoading={isLoading}
      />
    </aside>
  );
}
