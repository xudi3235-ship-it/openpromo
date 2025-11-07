import { Skeleton } from "@openpromo/ui/components/skeleton";
import { createFileRoute, Link } from "@tanstack/react-router";
import type { MergedContentEntity } from "@worker/routes/api/workspaces/content";
import { useMemo } from "react";
import { HomeHeroCard } from "@/components/home/HomeHeroCard";
import { HomeQuickActions } from "@/components/home/HomeQuickActions";
import { HomeSystemHealthCard } from "@/components/home/HomeSystemHealthCard";
import { InsightsGoalProgress } from "@/components/insights/InsightsGoalProgress";
import { InsightsInboxSummary } from "@/components/insights/InsightsInboxSummary";
import { InsightsNextActions } from "@/components/insights/InsightsNextActions";
import { InsightsSummaryCards } from "@/components/insights/InsightsSummaryCards";
import {
  InsightsTopContent,
  InsightsTopContentSkeleton,
} from "@/components/insights/InsightsTopContent";
import { useWorkspace } from "@/hooks/useWorkspace";
import {
  useWorkspaceInsightSnapshot,
  useWorkspaceInsightsInboxSummary,
  useWorkspaceInsightsStatus,
  useWorkspaceInsightsTopContent,
} from "@/queries/insights";

export const Route = createFileRoute(
  "/_authenticated/workspaces/$workspaceSlug/",
)({
  component: WorkspaceHomePage,
});

function WorkspaceHomePage() {
  const { workspace } = useWorkspace();
  const { data: snapshotRecord, isPending: snapshotPending } =
    useWorkspaceInsightSnapshot();
  const { data: status } = useWorkspaceInsightsStatus();
  const { data: inboxSummary, isLoading: inboxLoading } =
    useWorkspaceInsightsInboxSummary();
  const { data: topContent, isLoading: topContentLoading } =
    useWorkspaceInsightsTopContent({ limit: 3, sortBy: "impressions" });

  const normalizedStatus = useMemo(() => {
    if (!status) return undefined;
    return {
      contentLastRefreshedAt: status.contentLastRefreshedAt
        ? new Date(status.contentLastRefreshedAt)
        : null,
      followerLastCollectedAt: status.followerLastCollectedAt
        ? new Date(status.followerLastCollectedAt)
        : null,
      inboxLastUpdatedAt: status.inboxLastUpdatedAt
        ? new Date(status.inboxLastUpdatedAt)
        : null,
    };
  }, [status]);

  const heroHighlight = snapshotRecord?.snapshot.narrativeHighlights?.[0];
  const topStreak = useMemo(() => {
    const streaks = snapshotRecord?.snapshot.goals?.map((g) => g.streak ?? 0);
    return streaks && streaks.length > 0 ? Math.max(...streaks) : undefined;
  }, [snapshotRecord?.snapshot.goals]);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <HomeHeroCard
          workspaceName={workspace.name}
          workspaceSlug={workspace.slug}
          highlight={heroHighlight}
          streak={topStreak}
          isLoading={snapshotPending}
        />

        <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
          <InsightsSummaryCards snapshotRecord={snapshotRecord ?? undefined} />
          <HomeSystemHealthCard
            status={normalizedStatus}
            workspaceSlug={workspace.slug}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
          {inboxLoading ? (
            <div className="bg-card rounded-xl p-5 border border-border/40">
              <Skeleton className="h-5 w-32 mb-4 rounded" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {["a", "b", "c"].map((key) => (
                  <div
                    key={key}
                    className="rounded-lg border border-border/40 p-4 bg-background"
                  >
                    <Skeleton className="h-3 w-24 mb-3 rounded" />
                    <Skeleton className="h-6 w-20 mb-2 rounded" />
                    <Skeleton className="h-3 w-28 rounded" />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <InsightsInboxSummary summary={inboxSummary} />
          )}
          <HomeQuickActions workspaceSlug={workspace.slug} />
        </div>

        <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
          <InsightsNextActions
            goals={snapshotRecord?.snapshot.goals}
            highlights={snapshotRecord?.snapshot.narrativeHighlights}
          />
          <div className="bg-card rounded-xl p-5 border border-border/40">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="font-medium text-foreground">Top content</h2>
                <p className="text-xs text-muted-foreground">
                  Highest performing posts over the selected period
                </p>
              </div>
              <Link
                to="/workspaces/$workspaceSlug/insights"
                params={{ workspaceSlug: workspace.slug }}
                className="text-xs text-primary hover:underline"
              >
                View all
              </Link>
            </div>
            {topContentLoading ? (
              <InsightsTopContentSkeleton rows={3} />
            ) : (
              <InsightsTopContent
                items={
                  ((topContent?.items ?? []) as MergedContentEntity[]) ?? []
                }
              />
            )}
          </div>
        </div>

        <InsightsGoalProgress
          goals={snapshotRecord?.snapshot.goals}
          isLoading={snapshotPending}
        />
      </div>
    </div>
  );
}
