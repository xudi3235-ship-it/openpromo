import { Tabs, TabsList, TabsTrigger } from "@openpromo/ui/components/tabs";
import { startOfDay, subDays } from "date-fns";
import { useMemo, useState } from "react";
import {
  type TimeSeriesQueryParams,
  useWorkspaceInsightsSummary,
  useWorkspaceInsightsTimeSeries,
  useWorkspaceInsightsTopContent,
} from "@/queries/insights";
import { InsightsSummaryCards } from "./InsightsSummaryCards";
import { InsightsTimeSeriesChart } from "./InsightsTimeSeriesChart";
import { InsightsTopContent } from "./InsightsTopContent";

type TimeRange = "7d" | "30d" | "90d";

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
  const { data: summary, isLoading: summaryLoading } =
    useWorkspaceInsightsSummary();

  const { data: timeSeries, isLoading: timeSeriesLoading } =
    useWorkspaceInsightsTimeSeries(dateRange);

  const { data: topContent, isLoading: topContentLoading } =
    useWorkspaceInsightsTopContent({ limit: 5, sortBy: "impressions" });

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
        {summaryLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {Array.from({ length: 6 }, (_, i) => `skeleton-summary-${i}`).map(
              (key) => (
                <div
                  key={key}
                  className="bg-card rounded-lg p-4 border border-border/40 animate-pulse"
                >
                  <div className="h-4 w-4 bg-muted rounded mb-2" />
                  <div className="h-6 bg-muted rounded mb-1" />
                  <div className="h-3 bg-muted rounded w-20" />
                </div>
              ),
            )}
          </div>
        ) : (
          <InsightsSummaryCards summary={summary} />
        )}

        {/* Time Series Chart */}
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
            <div className="h-[300px] animate-pulse bg-muted rounded" />
          ) : (
            <InsightsTimeSeriesChart data={timeSeries} />
          )}
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
            <div className="space-y-3">
              {Array.from({ length: 5 }, (_, i) => `skeleton-top-${i}`).map(
                (key) => (
                  <div
                    key={key}
                    className="h-20 animate-pulse bg-muted rounded-lg"
                  />
                ),
              )}
            </div>
          ) : (
            <InsightsTopContent items={topContent?.items ?? []} />
          )}
        </div>
      </div>
    </div>
  );
}
