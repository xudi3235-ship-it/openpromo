import { Skeleton } from "@openpromo/ui/components/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@openpromo/ui/components/tabs";
import { useParams } from "@tanstack/react-router";
import type { MergedContentEntity } from "@worker/shared/content-types";
import { startOfDay, subDays } from "date-fns";
import { useMemo, useState } from "react";
import { MomentumCard } from "@/components/momentum/MomentumCard";
import {
  type TimeSeriesQueryParams,
  useWorkspaceInsightSnapshot,
  useWorkspaceInsightsInboxSummary,
  useWorkspaceInsightsTimeSeries,
  useWorkspaceInsightsTopContent,
} from "@/queries/insights";
import { InsightsActions } from "./InsightsActions";
import { InsightsGoalProgress } from "./InsightsGoalProgress";
import { InsightsTimeSeriesChart } from "./InsightsTimeSeriesChart";
import { PlatformBreakdown } from "./PlatformBreakdown";
import { TopContentGrid } from "./TopContentGrid";

type TimeRange = "7d" | "30d" | "90d";

function formatNumber(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return value.toLocaleString();
}

export function InsightsPage() {
  const { workspaceSlug } = useParams({
    from: "/_authenticated/workspaces/$workspaceSlug/insights",
  });

  const [timeRange, setTimeRange] = useState<TimeRange>("30d");
  const [interval, setInterval] = useState<"day" | "week">("day");

  // Memoize date range to prevent constant recreating with new timestamps
  const dateRange: TimeSeriesQueryParams = useMemo(() => {
    const today = startOfDay(new Date());
    const days = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90;

    return {
      end: today,
      start: subDays(today, days),
      interval,
    };
  }, [timeRange, interval]);

  // Fetch data independently
  const { data: snapshot, isPending: snapshotPending } =
    useWorkspaceInsightSnapshot();

  const { data: timeSeries, isLoading: timeSeriesLoading } =
    useWorkspaceInsightsTimeSeries(dateRange);

  const { data: topContent, isLoading: topContentLoading } =
    useWorkspaceInsightsTopContent({
      limit: 8,
      sortBy: "impressions",
      start: dateRange.start,
      end: dateRange.end,
    });

  const { data: inboxSummary } = useWorkspaceInsightsInboxSummary();

  // Compute derived data
  const topContentItems = (topContent?.items ?? []) as MergedContentEntity[];

  // Summary stats data
  const funnel = snapshot?.snapshot.funnel;
  const reach = funnel?.awareness ?? 0;
  const engagement = funnel?.engagement ?? 0;
  const clicks = funnel?.clicks ?? 0;
  const conversions = funnel?.conversions ?? 0;
  const hasData = reach > 0 || engagement > 0;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header with summary and time range selector */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            {snapshotPending ? (
              <>
                <Skeleton className="h-7 w-48 rounded" />
                <Skeleton className="h-5 w-72 rounded" />
              </>
            ) : hasData ? (
              <>
                <h1 className="text-xl font-semibold text-foreground">
                  Insights
                </h1>
                <p className="text-muted-foreground">
                  Your content reached{" "}
                  <span className="font-medium text-foreground">
                    {formatNumber(reach)}
                  </span>{" "}
                  people and drove{" "}
                  <span className="font-medium text-foreground">
                    {formatNumber(engagement)}
                  </span>{" "}
                  engagements
                </p>
              </>
            ) : (
              <>
                <h1 className="text-xl font-semibold text-foreground">
                  Insights
                </h1>
                <p className="text-muted-foreground">
                  Publish content to see how it's performing
                </p>
              </>
            )}
          </div>
          <Tabs
            value={timeRange}
            onValueChange={(v) => setTimeRange(v as TimeRange)}
          >
            <TabsList>
              <TabsTrigger value="7d">7 days</TabsTrigger>
              <TabsTrigger value="30d">30 days</TabsTrigger>
              <TabsTrigger value="90d">90 days</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Summary Stats Row */}
        {snapshotPending ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {["a", "b", "c", "d"].map((key) => (
              <div
                key={key}
                className="rounded-xl border border-border/40 bg-card p-4"
              >
                <Skeleton className="h-8 w-16 rounded" />
                <Skeleton className="h-4 w-20 mt-1 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-xl border border-border/40 bg-card p-4">
              <p className="text-2xl font-semibold text-foreground">
                {formatNumber(reach)}
              </p>
              <p className="text-sm text-muted-foreground">Reach</p>
            </div>
            <div className="rounded-xl border border-border/40 bg-card p-4">
              <p className="text-2xl font-semibold text-foreground">
                {formatNumber(engagement)}
              </p>
              <p className="text-sm text-muted-foreground">Engagement</p>
            </div>
            <div className="rounded-xl border border-border/40 bg-card p-4">
              <p className="text-2xl font-semibold text-foreground">
                {formatNumber(clicks)}
              </p>
              <p className="text-sm text-muted-foreground">Clicks</p>
            </div>
            <div className="rounded-xl border border-border/40 bg-card p-4">
              <p className="text-2xl font-semibold text-foreground">
                {formatNumber(conversions)}
              </p>
              <p className="text-sm text-muted-foreground">Conversions</p>
            </div>
          </div>
        )}

        {/* Top Content + Engagement Trend */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <TopContentGrid
            items={topContentItems}
            isLoading={topContentLoading}
            workspaceSlug={workspaceSlug}
            limit={4}
          />

          <MomentumCard className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-foreground">
                  Engagement trend
                </h3>
                <p className="text-xs text-muted-foreground">
                  Impressions and engagement over time
                </p>
              </div>
              <Tabs
                value={interval}
                onValueChange={(v) => setInterval(v as "day" | "week")}
              >
                <TabsList className="h-7">
                  <TabsTrigger value="day" className="text-xs px-2 py-1">
                    Daily
                  </TabsTrigger>
                  <TabsTrigger value="week" className="text-xs px-2 py-1">
                    Weekly
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            {timeSeriesLoading ? (
              <Skeleton className="h-[250px] rounded" />
            ) : (
              <InsightsTimeSeriesChart data={timeSeries} />
            )}
          </MomentumCard>
        </div>

        {/* Goals + Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <InsightsGoalProgress
            goals={snapshot?.snapshot.goals}
            isLoading={snapshotPending}
          />
          <InsightsActions
            goals={snapshot?.snapshot.goals}
            inboxSummary={inboxSummary}
            hasRecentAiContent={false}
          />
        </div>

        {/* Platform Breakdown (collapsed) */}
        <PlatformBreakdown
          items={topContentItems}
          isLoading={topContentLoading}
        />
      </div>
    </div>
  );
}
