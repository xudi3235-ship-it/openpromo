import type { InboxSummary, InsightGoalSummary } from "@shared/insights";
import { Link, useParams } from "@tanstack/react-router";
import { Calendar, Inbox, Sparkles } from "lucide-react";
import { MomentumCard } from "@/components/momentum/MomentumCard";

type InsightsActionsProps = {
  goals?: InsightGoalSummary[];
  inboxSummary?: InboxSummary;
  hasRecentAiContent?: boolean;
};

type ActionItem = {
  icon: typeof Sparkles;
  label: string;
  to: string;
  params?: Record<string, string>;
};

export function InsightsActions({
  goals,
  inboxSummary,
  hasRecentAiContent,
}: InsightsActionsProps) {
  const { workspaceSlug } = useParams({
    from: "/_authenticated/workspaces/$workspaceSlug",
  });

  const actions: ActionItem[] = [];

  // Check if user is behind on goals
  const behindOnGoal = goals?.some((g) => (g.progressPercent ?? 0) < 0.5);

  // Check for unread inbox messages
  const unreadCount = inboxSummary?.openMessages ?? 0;

  // Build dynamic actions
  if (!hasRecentAiContent) {
    actions.push({
      icon: Sparkles,
      label: "Create AI visual",
      to: "/workspaces/$workspaceSlug/visuals",
      params: { workspaceSlug },
    });
  }

  if (behindOnGoal) {
    actions.push({
      icon: Calendar,
      label: "Schedule post to stay on track",
      to: "/workspaces/$workspaceSlug/composer",
      params: { workspaceSlug },
    });
  } else {
    actions.push({
      icon: Calendar,
      label: "Schedule next post",
      to: "/workspaces/$workspaceSlug/composer",
      params: { workspaceSlug },
    });
  }

  if (unreadCount > 0) {
    actions.push({
      icon: Inbox,
      label: `Review messages (${unreadCount})`,
      to: "/workspaces/$workspaceSlug/inbox",
      params: { workspaceSlug },
    });
  }

  return (
    <MomentumCard className="space-y-4">
      <h3 className="text-sm font-medium text-foreground">Actions</h3>
      <div className="space-y-2">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.label}
              to={action.to}
              params={action.params}
              className="flex items-center gap-3 rounded-xl border border-border/40 p-3 transition-colors hover:bg-muted/50 hover:border-border/80"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm font-medium text-foreground">
                {action.label}
              </span>
            </Link>
          );
        })}
      </div>
    </MomentumCard>
  );
}
