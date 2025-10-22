import { createFileRoute } from "@tanstack/react-router";
import { startOfDay, subDays } from "date-fns";
import { InsightsPage } from "@/components/insights/InsightsPage";
import { WorkspaceLoading } from "@/components/loading/workspace-loading";
import {
  prefetchWorkspaceInsightsInboxSummary,
  prefetchWorkspaceInsightsSummary,
  prefetchWorkspaceInsightsTimeSeries,
  prefetchWorkspaceInsightsTopContent,
} from "@/queries/insights";

export const Route = createFileRoute(
  "/_authenticated/workspaces/$workspaceSlug/insights",
)({
  loader: ({ params, context }) => {
    // Prefetch all insights data with defaults
    prefetchWorkspaceInsightsSummary(context.queryClient, params.workspaceSlug);
    prefetchWorkspaceInsightsTimeSeries(
      context.queryClient,
      params.workspaceSlug,
    );
    const end = startOfDay(new Date());
    const start = subDays(end, 30);
    prefetchWorkspaceInsightsTopContent(
      context.queryClient,
      params.workspaceSlug,
      { start, end },
    );
    prefetchWorkspaceInsightsInboxSummary(
      context.queryClient,
      params.workspaceSlug,
    );
  },
  pendingComponent: WorkspaceLoading,
  component: InsightsPage,
});
