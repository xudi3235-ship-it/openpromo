import { useWorkspace } from "@/hooks/useWorkspace";
import { useHonoQuery } from "@/lib/hono-client";
import { QUERY_KEYS } from "@/lib/query";

export const useWorkspaceMembers = () => {
  const { workspace } = useWorkspace();

  return useHonoQuery({
    queryKey: QUERY_KEYS.WORKSPACE_MEMBERS(workspace.slug),
    queryFn: (api) =>
      api.workspaces[":workspaceSlug"].team.$get({
        param: { workspaceSlug: workspace.slug },
      }),
    errorMessage: "Failed to load workspace members",
    refetchOnMount: true,
  });
};
