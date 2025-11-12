import type { AllPlatforms } from "@shared/content";
import type { WorkspaceInsightSnapshotRecord } from "@shared/insights";
import { type QueryClient, useQuery } from "@tanstack/react-query";
import type { MergedContentEntity } from "@worker/shared/content-types";
import { useWorkspace } from "@/hooks/useWorkspace";
import { orpc } from "@/lib/orpc-client";
import { QUERY_KEYS } from "@/lib/query";

/**
 * Query options for workspace insights summary
 */
const workspaceInsightsSummaryQueryOpts = (workspaceSlug: string) => ({
  ...orpc.insights.getSummary.queryOptions({
    input: { workspaceSlug },
  }),
  queryKey: QUERY_KEYS.WORKSPACE_INSIGHTS_SUMMARY(workspaceSlug),
  staleTime: 1000 * 60 * 5,
  refetchOnMount: false,
  refetchOnWindowFocus: false,
});

const workspaceInsightsStatusQueryOpts = (workspaceSlug: string) => ({
  ...orpc.insights.getStatus.queryOptions({
    input: { workspaceSlug },
  }),
  queryKey: QUERY_KEYS.WORKSPACE_INSIGHTS_STATUS(workspaceSlug),
  staleTime: 1000 * 60 * 5,
  refetchOnMount: false,
  refetchOnWindowFocus: false,
});

/**
 * Prefetch workspace insights summary
 */
export const prefetchWorkspaceInsightsSummary = (
  queryClient: QueryClient,
  workspaceSlug: string,
) => {
  queryClient.prefetchQuery(workspaceInsightsSummaryQueryOpts(workspaceSlug));
};

export const prefetchWorkspaceInsightsStatus = (
  queryClient: QueryClient,
  workspaceSlug: string,
) => {
  queryClient.prefetchQuery(workspaceInsightsStatusQueryOpts(workspaceSlug));
};

/**
 * Hook to fetch workspace insights summary
 * Returns aggregated metrics totals and last refresh timestamp
 */
export const useWorkspaceInsightsSummary = () => {
  const { workspace } = useWorkspace();

  return useQuery(workspaceInsightsSummaryQueryOpts(workspace.slug));
};

export const useWorkspaceInsightsStatus = () => {
  const { workspace } = useWorkspace();

  return useQuery(workspaceInsightsStatusQueryOpts(workspace.slug));
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
    ...orpc.insights.getTimeSeries.queryOptions({
      input: {
        workspaceSlug,
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        interval,
      },
    }),
    queryKey: QUERY_KEYS.WORKSPACE_INSIGHTS_TIMESERIES(
      workspaceSlug,
      startDate,
      endDate,
      interval,
    ),
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
    workspaceInsightsTimeSeriesQueryOpts(workspaceSlug, params),
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

  return useQuery({
    ...workspaceInsightsTimeSeriesQueryOpts(workspace.slug, params),
    select: (data) =>
      data?.map((point) => ({
        ...point,
        bucket:
          typeof point.bucket === "string"
            ? point.bucket
            : new Date(point.bucket).toISOString(),
      })),
  });
};

export type TopContentQueryParams = {
  limit?: number;
  sortBy?: "impressions" | "engagement";
  start?: Date;
  end?: Date;
  platform?: AllPlatforms;
};

/**
 * Query options for workspace top content
 */
const workspaceInsightsTopContentQueryOpts = (
  workspaceSlug: string,
  params: TopContentQueryParams = {},
) => {
  const { limit = 5, sortBy = "impressions", start, end, platform } = params;

  return {
    ...orpc.insights.getTopContent.queryOptions({
      input: {
        workspaceSlug,
        limit,
        sortBy,
        start: start?.toISOString(),
        end: end?.toISOString(),
        platform,
      },
    }),
    queryKey: QUERY_KEYS.WORKSPACE_INSIGHTS_TOP_CONTENT(
      workspaceSlug,
      limit,
      sortBy,
      start?.toISOString(),
      end?.toISOString(),
      platform ?? null,
    ),
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
    workspaceInsightsTopContentQueryOpts(workspaceSlug, params),
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

  return useQuery({
    ...workspaceInsightsTopContentQueryOpts(workspace.slug, params),
    staleTime: 1000 * 60 * 5,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    select: (data) => ({
      items: (data?.items ?? []) as MergedContentEntity[],
    }),
  });
};

const workspaceInboxSummaryQueryOpts = (workspaceSlug: string) => ({
  ...orpc.insights.getInboxSummary.queryOptions({
    input: { workspaceSlug },
  }),
  queryKey: QUERY_KEYS.WORKSPACE_INSIGHTS_INBOX_SUMMARY(workspaceSlug),
  staleTime: 1000 * 60 * 5,
  refetchOnMount: false,
  refetchOnWindowFocus: false,
});

export const prefetchWorkspaceInsightsInboxSummary = (
  queryClient: QueryClient,
  workspaceSlug: string,
) => {
  queryClient.prefetchQuery(workspaceInboxSummaryQueryOpts(workspaceSlug));
};

export const useWorkspaceInsightsInboxSummary = () => {
  const { workspace } = useWorkspace();

  return useQuery(workspaceInboxSummaryQueryOpts(workspace.slug));
};

export const useWorkspaceInsightSnapshot = () => {
  const { workspace } = useWorkspace();

  return useQuery<WorkspaceInsightSnapshotRecord>(
    orpc.insights.getSnapshot.queryOptions({
      input: { workspaceSlug: workspace.slug },
    }),
  );
};
