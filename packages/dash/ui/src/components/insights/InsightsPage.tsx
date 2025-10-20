import { Tabs, TabsList, TabsTrigger } from "@openpromo/ui/components/tabs";
import { subDays } from "date-fns";
import { useState } from "react";
import { WorkspaceLoading } from "@/components/loading/workspace-loading";
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

  // Calculate date range based on selection
  const dateRange: TimeSeriesQueryParams = {
    end: new Date(),
    start: subDays(
      new Date(),
      timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90,
    ),
    interval,
  };

  // Fetch data
  const {
    data: summary,
    isLoading: summaryLoading,
    error: summaryError,
  } = useWorkspaceInsightsSummary();

  const {
    data: timeSeries,
    isLoading: timeSeriesLoading,
    error: timeSeriesError,
  } = useWorkspaceInsightsTimeSeries(dateRange);

  const {
    data: topContent,
    isLoading: topContentLoading,
    error: topContentError,
  } = useWorkspaceInsightsTopContent({ limit: 5, sortBy: "impressions" });

  const isLoading = summaryLoading || timeSeriesLoading || topContentLoading;
  const hasError = summaryError || timeSeriesError || topContentError;

  if (isLoading) {
    return <WorkspaceLoading />;
  }

  if (hasError) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-card rounded-lg p-8 border border-border/40 text-center">
            <p className="text-muted-foreground">
              Failed to load insights. Please try again.
            </p>
          </div>
        </div>
      </div>
    );
  }

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
        <InsightsSummaryCards summary={summary} />

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
          <InsightsTimeSeriesChart data={timeSeries} />
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
          <InsightsTopContent items={topContent?.items ?? []} />
        </div>
      </div>
    </div>
  );
}
