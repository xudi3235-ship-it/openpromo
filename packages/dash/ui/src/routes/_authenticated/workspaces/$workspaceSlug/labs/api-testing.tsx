import { Button } from "@openpromo/ui/components/button";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { orpc } from "@/lib/orpc-client";
import {
  useTestAnalyticsWriteMutation,
  useTestBackfillMutation,
  useTestMetricsRefreshMutation,
} from "@/queries/workspace-internal-testing";

function ApiTestingPage() {
  const backfillMutation = useTestBackfillMutation();
  const metricsMutation = useTestMetricsRefreshMutation();
  const analyticsMutation = useTestAnalyticsWriteMutation();
  const planetListQuery = useQuery(
    orpc.planet.list.queryOptions({ input: {} }),
  );

  const snapshotMutation = useMutation(
    orpc.insights.getSnapshot.mutationOptions({
      onSuccess: () => {
        // no-op; query invalidation handled via generated helpers if needed
      },
    }),
  );

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold mb-2">API Testing Playground</h2>
        <p className="text-muted-foreground">
          Quick helpers for exercising internal backfill, metrics refresh, and
          analytics feeds.
        </p>
      </div>

      <div className="flex flex-wrap gap-4">
        <Button
          onClick={() => {
            backfillMutation.mutate();
          }}
          disabled={backfillMutation.isPending}
        >
          {backfillMutation.isPending ? "Testing..." : "Test Backfill"}
        </Button>

        <Button
          onClick={() => metricsMutation.mutate(undefined)}
          disabled={metricsMutation.isPending}
        >
          {metricsMutation.isPending ? "Testing..." : "Test Metrics Refresh"}
        </Button>

        <Button
          onClick={() => analyticsMutation.mutate(undefined)}
          disabled={analyticsMutation.isPending}
        >
          {analyticsMutation.isPending ? "Testing..." : "Test Analytics Write"}
        </Button>

        <Button
          onClick={() =>
            snapshotMutation.mutate({
              forceRegenerate: true,
            })
          }
          disabled={snapshotMutation.isPending}
        >
          {snapshotMutation.isPending
            ? "Generating..."
            : "Generate Insight Snapshot"}
        </Button>

        <Button
          onClick={() => planetListQuery.refetch()}
          disabled={planetListQuery.isFetching}
        >
          {planetListQuery.isFetching ? "Fetching..." : "test ORPC Planet List"}
          {planetListQuery.data && ` (${planetListQuery.data.length} planets)`}
        </Button>
      </div>
    </div>
  );
}

export const Route = createFileRoute(
  "/_authenticated/workspaces/$workspaceSlug/labs/api-testing",
)({
  component: ApiTestingPage,
});
