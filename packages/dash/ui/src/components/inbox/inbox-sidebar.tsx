import { Stack } from "@openpromo/ui/components/stack";
import {
  Surface,
  SurfaceBody,
  SurfaceHeader,
} from "@openpromo/ui/components/surface";
import type { InboxConversationSummary } from "@shared/inbox";
import { Loader2 } from "lucide-react";
import { InboxConversationList } from "./inbox-conversation-list";
import { InboxFilters } from "./inbox-filters";

interface InboxSidebarProps {
  conversations: InboxConversationSummary[];
  isLoading: boolean;
  isFetching: boolean;
  hasNextPage?: boolean;
  fetchNextPage?: () => void;
  isFetchingNextPage?: boolean;
}

export function InboxSidebar({
  conversations,
  isLoading,
  isFetching,
  hasNextPage,
  fetchNextPage,
  isFetchingNextPage,
}: InboxSidebarProps) {
  return (
    <Surface
      asChild
      padded="none"
      className="flex w-full max-w-sm flex-col overflow-hidden sm:w-72 lg:w-80"
    >
      <aside>
        <SurfaceHeader padded="sm" divider>
          <Stack gap="xs">
            <InboxFilters />
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>
                {conversations.length} conversation
                {conversations.length !== 1 ? "s" : ""}
              </span>
              {isFetching && (
                <span className="inline-flex items-center gap-1 text-foreground">
                  <Loader2 className="h-2.5 w-2.5 animate-spin" /> Syncing…
                </span>
              )}
            </div>
          </Stack>
        </SurfaceHeader>
        <SurfaceBody padded="none" className="flex-1 overflow-hidden">
          <InboxConversationList
            conversations={conversations}
            isLoading={isLoading}
            hasNextPage={hasNextPage}
            fetchNextPage={fetchNextPage}
            isFetchingNextPage={isFetchingNextPage}
          />
        </SurfaceBody>
      </aside>
    </Surface>
  );
}
