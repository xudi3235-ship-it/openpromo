import type { QueryClient } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import { useWorkspace } from "@/hooks/useWorkspace";
import { orpc } from "@/lib/orpc-client";

export const usePresetsQuery = () => {
  const { workspace } = useWorkspace();
  return useQuery(
    orpc.productVisuals.presets.queryOptions({
      input: {
        workspaceSlug: workspace.slug,
      },
    }),
  );
};

export const prefetchPresetsQuery = (
  queryClient: QueryClient,
  workspaceSlug: string,
) => {
  queryClient.prefetchQuery(
    orpc.productVisuals.presets.queryOptions({
      input: { workspaceSlug },
    }),
  );
};
