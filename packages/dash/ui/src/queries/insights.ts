import type { QueryClient } from "@tanstack/react-query";
import { useWorkspace } from "@/hooks/useWorkspace";
import { convertHonoQueryOptions, useHonoQuery } from "@/lib/hono-client";
import { QUERY_KEYS } from "@/lib/query";

/**
 * Query options for workspace insights summary
 */
const workspaceInsightsSummaryQueryOpts = (workspaceSlug: string) => ({
  queryKey: QUERY_KEYS.WORKSPACE_INSIGHTS_SUMMARY(workspaceSlug),
  queryFn: (api: typeof import("@/lib/hono-client").apiClient) =>
    api.workspaces[":workspaceSlug"].insights.summary.$get({
      param: { workspaceSlug },
    }),
});

/**
 * Prefetch workspace insights summary
 */
export const prefetchWorkspaceInsightsSummary = (
  queryClient: QueryClient,
  workspaceSlug: string,
) => {
  queryClient.prefetchQuery(
    convertHonoQueryOptions(workspaceInsightsSummaryQueryOpts(workspaceSlug)),
  );
};

/**
 * Hook to fetch workspace insights summary
 * Returns aggregated metrics totals and last refresh timestamp
 */
export const useWorkspaceInsightsSummary = () => {
  const { workspace } = useWorkspace();

  return useHonoQuery({
    ...workspaceInsightsSummaryQueryOpts(workspace.slug),
    errorMessage: "Failed to load workspace insights summary",
  });
};

export type TimeSeriesQueryParams = {
  start?: Date;
  end?: Date;
  interval?: "day" | "week";
};

const defaultTimeSeriesParams = {
  days: 30,
  interval: "day" as const,
};

/**
 * Query options for workspace insights time series
 */
const workspaceInsightsTimeSeriesQueryOpts = (
  workspaceSlug: string,
  params: TimeSeriesQueryParams = {},
) => {
  const { start, end, interval = defaultTimeSeriesParams.interval } = params;

  // Use provided dates or default to last 30 days
  const endDate = end || new Date();
  const startDate =
    start ||
    new Date(
      endDate.getTime() - defaultTimeSeriesParams.days * 24 * 60 * 60 * 1000,
    );

  return {
    queryKey: QUERY_KEYS.WORKSPACE_INSIGHTS_TIMESERIES(
      workspaceSlug,
      startDate,
      endDate,
      interval,
    ),
    queryFn: (api: typeof import("@/lib/hono-client").apiClient) =>
      api.workspaces[":workspaceSlug"].insights.timeseries.$get({
        param: { workspaceSlug },
        query: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          interval,
        },
      }),
  };
};

/**
 * Prefetch workspace insights time series data
 */
export const prefetchWorkspaceInsightsTimeSeries = (
  queryClient: QueryClient,
  workspaceSlug: string,
  params: TimeSeriesQueryParams = {},
) => {
  queryClient.prefetchQuery(
    convertHonoQueryOptions(
      workspaceInsightsTimeSeriesQueryOpts(workspaceSlug, params),
    ),
  );
};

/**
 * Hook to fetch workspace insights time series data
 * Returns time-bucketed metrics for the specified date range
 */
export const useWorkspaceInsightsTimeSeries = (
  params: TimeSeriesQueryParams = {},
) => {
  const { workspace } = useWorkspace();

  return useHonoQuery({
    ...workspaceInsightsTimeSeriesQueryOpts(workspace.slug, params),
    errorMessage: "Failed to load workspace insights time series",
  });
};

export type TopContentQueryParams = {
  limit?: number;
  sortBy?: "impressions" | "engagement";
};

/**
 * Query options for workspace top content
 */
const workspaceInsightsTopContentQueryOpts = (
  workspaceSlug: string,
  params: TopContentQueryParams = {},
) => {
  const { limit = 5, sortBy = "impressions" } = params;

  return {
    queryKey: QUERY_KEYS.WORKSPACE_INSIGHTS_TOP_CONTENT(
      workspaceSlug,
      limit,
      sortBy,
    ),
    queryFn: (api: typeof import("@/lib/hono-client").apiClient) =>
      api.workspaces[":workspaceSlug"].insights["top-content"].$get({
        param: { workspaceSlug },
        query: {
          limit: limit.toString(),
          sortBy,
        },
      }),
  };
};

/**
 * Prefetch workspace top content
 */
export const prefetchWorkspaceInsightsTopContent = (
  queryClient: QueryClient,
  workspaceSlug: string,
  params: TopContentQueryParams = {},
) => {
  queryClient.prefetchQuery(
    convertHonoQueryOptions(
      workspaceInsightsTopContentQueryOpts(workspaceSlug, params),
    ),
  );
};

/**
 * Hook to fetch workspace top performing content
 * Returns top content sorted by impressions or engagement
 */
export const useWorkspaceInsightsTopContent = (
  params: TopContentQueryParams = {},
) => {
  const { workspace } = useWorkspace();

  return useHonoQuery({
    ...workspaceInsightsTopContentQueryOpts(workspace.slug, params),
    errorMessage: "Failed to load workspace top content",
  });
};
