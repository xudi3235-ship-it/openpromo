import { useWorkspace } from "@/hooks/useWorkspace";
import { useHonoQuery } from "@/lib/hono-client";

export const useContentListQuery = () => {
  const { workspace } = useWorkspace();
  return useHonoQuery({
    queryKey: ["content-list"],
    queryFn: (api) =>
      api.workspaces[":workspaceSlug"].content.$get({
        query: { page: "1", pageSize: "20" },
        param: { workspaceSlug: workspace.slug },
      }),
  });
};
