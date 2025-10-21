import {
  fetchWorkspaceMetricsSummary,
  fetchWorkspaceMetricsTimeSeries,
  fetchWorkspaceTopContent,
  type MetricsTimeSeriesInterval,
} from "@core/domain/content/metrics/queries";
import type {
  TimeSeriesPoint,
  TopContentEntry,
  WorkspaceSummary,
} from "@shared/insights";

export type InsightsTimeRange = {
  start: Date;
  end: Date;
};

export class WorkspaceInsightsAggregator {
  async getSummary(params: { workspaceId: string }): Promise<WorkspaceSummary> {
    return fetchWorkspaceMetricsSummary(params.workspaceId);
  }

  async getTimeSeries(params: {
    workspaceId: string;
    range: InsightsTimeRange;
    interval: MetricsTimeSeriesInterval;
  }): Promise<TimeSeriesPoint[]> {
    return fetchWorkspaceMetricsTimeSeries({
      workspaceId: params.workspaceId,
      range: params.range,
      interval: params.interval,
    });
  }

  async getTopContent(params: {
    workspaceId: string;
    limit?: number;
    sortBy?: "impressions" | "engagement";
  }): Promise<TopContentEntry[]> {
    return fetchWorkspaceTopContent({
      workspaceId: params.workspaceId,
      limit: params.limit,
      sortBy: params.sortBy,
    });
  }
}
