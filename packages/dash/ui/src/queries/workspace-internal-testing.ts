import type { InferResponseType } from "hono/client";
import { toast } from "sonner";
import { useWorkspace } from "@/hooks/useWorkspace";
import { type apiClient, useHonoMutation } from "@/lib/hono-client";

type TestBackfillResponse = InferResponseType<
  (typeof apiClient)["workspaces"][":workspaceSlug"]["internal"]["backfill"]["$get"]
>;

type TestMetricsRefreshResponse = InferResponseType<
  (typeof apiClient)["workspaces"][":workspaceSlug"]["internal"]["metrics"]["refresh"]["$get"]
>;

export const useTestBackfillMutation = (
  onSuccess?: (data: TestBackfillResponse) => void,
) => {
  const { workspace } = useWorkspace();

  return useHonoMutation<TestBackfillResponse, void>({
    mutationFn: (api) =>
      api.workspaces[":workspaceSlug"].internal.backfill.$get({
        param: { workspaceSlug: workspace.slug },
      }),
    onSuccess: (data) => {
      toast.success("Backfill started");
      onSuccess?.(data);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to start backfill");
    },
  });
};

export const useTestMetricsRefreshMutation = (
  onSuccess?: (data: TestMetricsRefreshResponse) => void,
) => {
  const { workspace } = useWorkspace();

  return useHonoMutation<TestMetricsRefreshResponse, void>({
    mutationFn: (api) =>
      api.workspaces[":workspaceSlug"].internal.metrics.refresh.$get({
        param: { workspaceSlug: workspace.slug },
      }),
    onSuccess: (data) => {
      toast.success("Metrics refresh triggered");
      onSuccess?.(data);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to refresh metrics");
    },
  });
};
