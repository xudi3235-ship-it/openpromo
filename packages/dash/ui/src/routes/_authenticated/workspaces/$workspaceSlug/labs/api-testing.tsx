import { Button } from "@openpromo/ui/components/button";
import { createFileRoute } from "@tanstack/react-router";
import {
  useTestBackfillMutation,
  useTestMetricsRefreshMutation,
} from "@/queries/workspace-internal-testing";

function ApiTestingPage() {
  const backfillMutation = useTestBackfillMutation();
  const metricsMutation = useTestMetricsRefreshMutation();

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">API Testing Playground</h2>
        <p className="text-muted-foreground">
          Test internal APIs for backfill and metrics
        </p>
      </div>

      <div className="flex gap-4">
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
      </div>
    </div>
  );
}

export const Route = createFileRoute(
  "/_authenticated/workspaces/$workspaceSlug/labs/api-testing",
)({
  component: ApiTestingPage,
});
