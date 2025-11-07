import { Skeleton } from "@openpromo/ui/components/skeleton";
import { createFileRoute, Link } from "@tanstack/react-router";
import type { MergedContentEntity } from "@worker/routes/api/workspaces/content";
import { useMemo } from "react";
import { HomeHeroCard } from "@/components/home/HomeHeroCard";
import { InsightsGoalProgress } from "@/components/insights/InsightsGoalProgress";
import { InsightsInboxSummary } from "@/components/insights/InsightsInboxSummary";
import { InsightsNextActions } from "@/components/insights/InsightsNextActions";
import { InsightsSummaryCards } from "@/components/insights/InsightsSummaryCards";
import {
  InsightsTopContent,
  InsightsTopContentSkeleton,
} from "@/components/insights/InsightsTopContent";
import { MomentumCard } from "@/components/momentum/MomentumCard";
import { useWorkspace } from "@/hooks/useWorkspace";
import {
  useWorkspaceInsightSnapshot,
  useWorkspaceInsightsInboxSummary,
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
  const { data: inboxSummary, isLoading: inboxLoading } =
    useWorkspaceInsightsInboxSummary();
  const { data: topContent, isLoading: topContentLoading } =
    useWorkspaceInsightsTopContent({ limit: 3, sortBy: "impressions" });

  const heroHighlight = snapshotRecord?.snapshot.narrativeHighlights?.[0];
  const topStreak = useMemo(() => {
    const streaks = snapshotRecord?.snapshot.goals?.map((g) => g.streak ?? 0);
    return streaks && streaks.length > 0 ? Math.max(...streaks) : undefined;
  }, [snapshotRecord?.snapshot.goals]);

  const heroSuggestion = useMemo(() => {
    if (
      !snapshotRecord?.snapshot.goals ||
      snapshotRecord.snapshot.goals.length === 0
    ) {
      return {
        label: "Starter cadence",
        description:
          "Publish three posts this week to unlock personalized targets.",
        ctaLabel: "Set starter goal",
        href: `/workspaces/${workspace.slug}/insights`,
      } as const;
    }

    const primaryGoal = snapshotRecord.snapshot.goals[0];
    const percent = Math.round(
      Math.min(1, Math.max(primaryGoal.progressPercent ?? 0, 0)) * 100,
    );

    return {
      label: "Stay on track",
      description: `You are ${percent}% of the way there. Keep the cadence to protect your streak.`,
      ctaLabel: "Review goals",
      href: `/workspaces/${workspace.slug}/insights`,
    } as const;
  }, [snapshotRecord?.snapshot.goals, workspace.slug]);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <HomeHeroCard
          workspaceName={workspace.name}
          workspaceSlug={workspace.slug}
          highlight={heroHighlight}
          streak={topStreak}
          isLoading={snapshotPending}
          suggestion={!snapshotPending ? heroSuggestion : undefined}
        />

        <InsightsGoalProgress
          goals={snapshotRecord?.snapshot.goals}
          isLoading={snapshotPending}
        />

        <InsightsSummaryCards snapshotRecord={snapshotRecord ?? undefined} />

        <InsightsNextActions
          goals={snapshotRecord?.snapshot.goals}
          highlights={snapshotRecord?.snapshot.narrativeHighlights}
        />

        <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
          {inboxLoading ? (
            <MomentumCard>
              <Skeleton className="h-5 w-32 mb-4 rounded" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {["a", "b", "c"].map((key) => (
                  <div
                    key={key}
                    className="rounded-xl border border-border/40 p-4"
                  >
                    <Skeleton className="h-3 w-24 mb-3 rounded" />
                    <Skeleton className="h-6 w-20 mb-2 rounded" />
                    <Skeleton className="h-3 w-28 rounded" />
                  </div>
                ))}
              </div>
            </MomentumCard>
          ) : (
            <InsightsInboxSummary summary={inboxSummary} />
          )}
          <MomentumCard tone="subtle" className="p-5">
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
          </MomentumCard>
        </div>
      </div>
    </div>
  );
}
