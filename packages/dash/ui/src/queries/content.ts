import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useHonoMutation, useHonoQuery } from "@/lib/hono-client";
import { QUERY_KEYS } from "@/lib/query";

export interface ContentListPaginationParams {
  page?: number;
  pageSize?: number;
}

export const useContentListQuery = (
  params: ContentListPaginationParams = {},
) => {
  const { workspace } = useWorkspace();
  const { page = 1, pageSize = 20 } = params;

  return useHonoQuery({
    queryKey: QUERY_KEYS.CONTENT_LIST(page, pageSize),
    queryFn: (api) =>
      api.workspaces[":workspaceSlug"].content.$get({
        query: { page: page.toString(), pageSize: pageSize.toString() },
        param: { workspaceSlug: workspace.slug },
      }),
  });
};

export const useContentGroupQuery = (contentGroupID: string | undefined) => {
  const { workspace } = useWorkspace();
  return useHonoQuery({
    queryKey: contentGroupID
      ? QUERY_KEYS.CONTENT_GROUP(contentGroupID)
      : ["content-group"],
    queryFn: (api) =>
      api.workspaces[":workspaceSlug"].content.group[":id"].$get({
        // biome-ignore lint/style/noNonNullAssertion: later
        param: { workspaceSlug: workspace.slug, id: contentGroupID! },
      }),
    enabled: !!contentGroupID,
  });
};

export const useContentGroupPublishMutation = () => {
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();

  return useHonoMutation({
    mutationFn: (api, contentGroupID: string) =>
      api.workspaces[":workspaceSlug"].content.group[":id"].$post({
        param: { workspaceSlug: workspace.slug, id: contentGroupID },
      }),
    onSuccess: () => {},
    onSettled: () => {
      queryClient.invalidateQueries({
        predicate: (q) =>
          Array.isArray(q.queryKey) && q.queryKey[0] === "content-list",
        type: "all",
      });
    },
  });
};

export const useContentGroupDeleteMutation = (onSettled?: () => void) => {
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();

  return useHonoMutation({
    mutationFn: (api, contentGroupID: string) =>
      api.workspaces[":workspaceSlug"].content.group[":id"].$delete({
        param: { workspaceSlug: workspace.slug, id: contentGroupID },
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        predicate: (q) =>
          Array.isArray(q.queryKey) && q.queryKey[0] === "content-list",
        type: "all",
      });
      toast.success("Content group deleted");
    },
    onSettled: () => {
      onSettled?.();
    },
  });
};

export const useContentDeleteMutation = (onSettled?: () => void) => {
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();

  return useHonoMutation({
    mutationFn: (api, contentID: string) =>
      api.workspaces[":workspaceSlug"].content.content[":id"].$delete({
        param: { workspaceSlug: workspace.slug, id: contentID },
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        predicate: (q) =>
          Array.isArray(q.queryKey) && q.queryKey[0] === "content-list",
        type: "all",
      });
      toast.success("Content deleted");
    },
    onSettled: () => {
      onSettled?.();
    },
  });
};
