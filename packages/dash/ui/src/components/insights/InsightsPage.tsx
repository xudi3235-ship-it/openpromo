import { Skeleton } from "@openpromo/ui/components/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@openpromo/ui/components/tabs";
import type { MergedContentEntity } from "@worker/shared/content-types";
import { formatDistanceToNow, startOfDay, subDays } from "date-fns";
import { useMemo, useState } from "react";
import {
  type TimeSeriesQueryParams,
  useWorkspaceInsightSnapshot,
  useWorkspaceInsightsInboxSummary,
  useWorkspaceInsightsStatus,
  useWorkspaceInsightsTimeSeries,
  useWorkspaceInsightsTopContent,
} from "@/queries/insights";
import { InsightsGoalProgress } from "./InsightsGoalProgress";
import { InsightsInboxSummary } from "./InsightsInboxSummary";
import { InsightsNarrativeHighlights } from "./InsightsNarrativeHighlights";
import { InsightsNextActions } from "./InsightsNextActions";
import { InsightsSummaryCards } from "./InsightsSummaryCards";
import { InsightsTimeSeriesChart } from "./InsightsTimeSeriesChart";
import {
  InsightsTopContent,
  InsightsTopContentSkeleton,
} from "./InsightsTopContent";

type TimeRange = "7d" | "30d" | "90d";

const SUMMARY_SKELETON_KEYS = [
  "impressions",
  "engagement",
  "clicks",
  "likes",
  "comments",
  "shares",
] as const;

const INBOX_SKELETON_KEYS = ["messages", "response", "rate"] as const;

export function InsightsPage() {
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
      limit: 5,
      sortBy: "impressions",
      start: dateRange.start,
      end: dateRange.end,
    });

  const { data: inboxSummary, isLoading: inboxSummaryLoading } =
    useWorkspaceInsightsInboxSummary();

  const { data: status } = useWorkspaceInsightsStatus();

  const formatRelative = (value: Date | string | null | undefined) => {
    if (!value) return "Never";
    return formatDistanceToNow(new Date(value), { addSuffix: true });
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground mb-1">
              Insights
            </h1>
            <p className="text-sm text-muted-foreground">
              Track your content performance and engagement metrics
            </p>
            {status && (
              <div className="text-xs text-muted-foreground flex flex-wrap gap-4 mt-1">
                <span>
                  Content refreshed{" "}
                  {formatRelative(status.contentLastRefreshedAt)}
                </span>
                <span>
                  Followers updated{" "}
                  {formatRelative(status.followerLastCollectedAt)}
                </span>
                <span>
                  Inbox updated {formatRelative(status.inboxLastUpdatedAt)}
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
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
            <Tabs
              value={interval}
              onValueChange={(v) => setInterval(v as "day" | "week")}
            >
              <TabsList>
                <TabsTrigger value="day">Daily</TabsTrigger>
                <TabsTrigger value="week">Weekly</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Summary Cards */}
        {snapshotPending ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {SUMMARY_SKELETON_KEYS.map((key) => (
              <div
                key={`summary-skeleton-${key}`}
                className="rounded-lg border border-border/40 p-4 bg-card"
              >
                <Skeleton className="h-4 w-4 mb-2 rounded" />
                <Skeleton className="h-6 mb-2 rounded" />
                <Skeleton className="h-3 w-16 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <InsightsSummaryCards snapshotRecord={snapshot ?? undefined} />
        )}

        {/* Narrative Highlights & Next Actions */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <InsightsNarrativeHighlights
            highlights={snapshot?.snapshot.narrativeHighlights}
            isLoading={snapshotPending}
          />
          <InsightsNextActions
            goals={snapshot?.snapshot.goals}
            highlights={snapshot?.snapshot.narrativeHighlights}
          />
        </div>

        {/* Inbox Summary */}
        {inboxSummaryLoading ? (
          <div className="bg-card rounded-lg p-6 border border-border/40">
            <Skeleton className="h-5 w-40 mb-4 rounded" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {INBOX_SKELETON_KEYS.map((key) => (
                <div
                  key={`inbox-skeleton-${key}`}
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

        {/* Goals & Time Series */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <InsightsGoalProgress
            goals={snapshot?.snapshot.goals}
            isLoading={snapshotPending}
          />
          <div className="bg-card rounded-lg p-6 border border-border/40">
            <div className="mb-4">
              <h2 className="font-medium text-foreground mb-1">
                Performance Over Time
              </h2>
              <p className="text-xs text-muted-foreground">
                Impressions and engagement trends
              </p>
            </div>
            {timeSeriesLoading ? (
              <Skeleton className="h-[300px] rounded" />
            ) : (
              <InsightsTimeSeriesChart data={timeSeries} />
            )}
          </div>
        </div>

        {/* Top Content */}
        <div className="bg-card rounded-lg p-6 border border-border/40">
          <div className="mb-4">
            <h2 className="font-medium text-foreground mb-1">
              Top Performing Content
            </h2>
            <p className="text-xs text-muted-foreground">
              Your best performing posts ranked by impressions
            </p>
          </div>
          {topContentLoading ? (
            <InsightsTopContentSkeleton rows={5} />
          ) : (
            <InsightsTopContent
              items={((topContent?.items ?? []) as MergedContentEntity[]) ?? []}
            />
          )}
        </div>
      </div>
    </div>
  );
}
