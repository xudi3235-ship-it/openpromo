import { createFileRoute } from "@tanstack/react-router";
import { subDays } from "date-fns";
import { InsightsPage } from "@/components/insights/InsightsPage";
import {
  prefetchWorkspaceInsightsSummary,
  prefetchWorkspaceInsightsTimeSeries,
  prefetchWorkspaceInsightsTopContent,
} from "@/queries/insights";

export const Route = createFileRoute(
  "/_authenticated/workspaces/$workspaceSlug/insights",
)({
  loader: ({ params, context }) => {
    // Prefetch all insights data
    prefetchWorkspaceInsightsSummary(context.queryClient, params.workspaceSlug);

    // Default to last 30 days
    const end = new Date();
    const start = subDays(end, 30);
    prefetchWorkspaceInsightsTimeSeries(
      context.queryClient,
      params.workspaceSlug,
      {
        start,
        end,
        interval: "day",
      },
    );

    prefetchWorkspaceInsightsTopContent(
      context.queryClient,
      params.workspaceSlug,
      {
        limit: 5,
        sortBy: "impressions",
      },
    );
  },
  component: InsightsPage,
});
