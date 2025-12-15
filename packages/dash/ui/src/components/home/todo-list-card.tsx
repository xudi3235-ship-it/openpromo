import { Skeleton } from "@openpromo/ui/components/skeleton";
import { Link } from "@tanstack/react-router";
import { FileText, Inbox, MessageSquare, MoveRight } from "lucide-react";
import { MomentumCard } from "@/components/momentum/MomentumCard";

type ToDoListCardProps = {
  workspaceSlug: string;
  openMessages: number;
  draftsCount: number;
  isLoading: boolean;
};

export function ToDoListCard({
  workspaceSlug,
  openMessages,
  draftsCount,
  isLoading,
}: ToDoListCardProps) {
  const hasItems = openMessages > 0 || draftsCount > 0;

  return (
    <MomentumCard className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
            <Inbox className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">To-Do List</h3>
            <p className="text-xs text-muted-foreground">
              Check unread messages and items requiring your attention
            </p>
          </div>
        </div>
        <Link
          to="/workspaces/$workspaceSlug/inbox"
          params={{ workspaceSlug }}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          View all in Inbox
          <MoveRight className="h-3 w-3" />
        </Link>
      </div>

      {isLoading ? (
        <div className="flex gap-3">
          <Skeleton className="h-16 flex-1 rounded-xl" />
          <Skeleton className="h-16 flex-1 rounded-xl" />
        </div>
      ) : hasItems ? (
        <div className="flex flex-wrap gap-3">
          {openMessages > 0 && (
            <Link
              to="/workspaces/$workspaceSlug/inbox"
              params={{ workspaceSlug }}
              className="flex items-center gap-2 rounded-xl border border-border/60 bg-muted/30 px-4 py-3 text-sm hover:bg-muted/50 transition-colors"
            >
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{openMessages}</span>
              <span className="text-muted-foreground">
                {openMessages === 1 ? "unread message" : "unread messages"}
              </span>
            </Link>
          )}
          {draftsCount > 0 && (
            <Link
              to="/workspaces/$workspaceSlug/content"
              params={{ workspaceSlug }}
              className="flex items-center gap-2 rounded-xl border border-border/60 bg-muted/30 px-4 py-3 text-sm hover:bg-muted/50 transition-colors"
            >
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{draftsCount}</span>
              <span className="text-muted-foreground">
                {draftsCount === 1 ? "draft" : "drafts"}
              </span>
            </Link>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border/60 p-4 text-center">
          <p className="text-sm text-muted-foreground">
            All caught up! No pending items.
          </p>
        </div>
      )}
    </MomentumCard>
  );
}
