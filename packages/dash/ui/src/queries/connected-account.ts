import { useWorkspace } from "@/hooks/useWorkspace";
import { useHonoQuery } from "@/lib/hono-client";

export const useConnectedAccounts = () => {
  const { workspace } = useWorkspace();
  return useHonoQuery({
    queryKey: [workspace.slug, "connected_accounts"],
    queryFn: (api) =>
      api.workspaces[":workspaceSlug"].connected_accounts.$get({
        param: { workspaceSlug: workspace.slug },
      }),
    errorMessage: "Failed to load connected accounts",
  });
};
