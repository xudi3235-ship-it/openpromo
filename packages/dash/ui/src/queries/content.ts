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

export const useContentGroupQuery = (contentGroupID: string | undefined) => {
  const { workspace } = useWorkspace();
  return useHonoQuery({
    queryKey: ["content-group", contentGroupID],
    queryFn: (api) =>
      api.workspaces[":workspaceSlug"].content.group[":id"].$get({
        // biome-ignore lint/style/noNonNullAssertion: later
        param: { workspaceSlug: workspace.slug, id: contentGroupID! },
      }),
    enabled: !!contentGroupID,
  });
};
