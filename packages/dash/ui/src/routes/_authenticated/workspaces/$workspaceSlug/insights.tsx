import { createFileRoute } from "@tanstack/react-router";
import { InsightsPage } from "@/components/insights/InsightsPage";
import { WorkspaceLoading } from "@/components/loading/workspace-loading";
import {
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
    prefetchWorkspaceInsightsTopContent(
      context.queryClient,
      params.workspaceSlug,
    );
  },
  pendingComponent: WorkspaceLoading,
  component: InsightsPage,
});
