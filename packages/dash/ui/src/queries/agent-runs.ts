import type { QueryClient } from "@tanstack/react-query";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  AgentRunsRouterInputs,
  AgentRunsRouterOutputs,
} from "@worker/orpc";
import { toast } from "sonner";
import { useWorkspace } from "@/hooks/useWorkspace";
import { orpc } from "@/lib/orpc-client";

export type AgentRunsListInput = Omit<
  AgentRunsRouterInputs["list"],
  "workspaceId" | "workspaceSlug"
>;
export type AgentRunsListOutput = AgentRunsRouterOutputs["list"];

export type AgentRunGetInput = Omit<
  AgentRunsRouterInputs["get"],
  "workspaceId" | "workspaceSlug"
>;

export const prefetchAgentRunsList = (
  queryClient: QueryClient,
  workspaceSlug: string,
  params: AgentRunsListInput,
) => {
  queryClient.prefetchQuery(
    orpc.agentRuns.list.queryOptions({ input: { ...params, workspaceSlug } }),
  );
};

export const useAgentRunsListQuery = (
  params: AgentRunsListInput,
  options?: { enabled?: boolean },
) => {
  const { workspace } = useWorkspace();

  const queryOptions = orpc.agentRuns.list.queryOptions({
    input: { ...params, workspaceSlug: workspace.slug },
  });

  return useQuery({
    ...queryOptions,
    enabled: options?.enabled ?? queryOptions.enabled ?? true,
    // Reduced from 30s - WebSocket invalidates on run_completed
    staleTime: 10_000,
    // Enable refetch to catch up after tab switch or reconnect
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
};

export const useAgentRunQuery = (
  params: AgentRunGetInput,
  options?: { enabled?: boolean },
) => {
  const { workspace } = useWorkspace();

  const queryOptions = orpc.agentRuns.get.queryOptions({
    input: { ...params, workspaceSlug: workspace.slug },
  });

  return useQuery({
    ...queryOptions,
    enabled: options?.enabled ?? queryOptions.enabled ?? true,
    // Keep data fresh longer - completed runs don't change
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchIntervalInBackground: false,
  });
};

export const useDeleteAgentRunsMutation = (onSuccess?: () => void) => {
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation<
    AgentRunsRouterOutputs["delete"],
    Error,
    AgentRunsRouterInputs["delete"]
  >({
    mutationFn: async (variables) =>
      orpc.agentRuns.delete.call({
        ...variables,
        workspaceSlug: workspace.slug,
      }),
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({
        queryKey: orpc.agentRuns.list.key(),
      });
      toast.success(
        `Deleted ${data.deletedCount} run${data.deletedCount === 1 ? "" : "s"}`,
      );
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete runs");
    },
  });
};
