import type { QueryClient } from "@tanstack/react-query";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import type { InferRequestType, InferResponseType } from "hono/client";
import { toast } from "sonner";
import { useWorkspace } from "@/hooks/useWorkspace";
import { apiClient, useHonoMutation, useHonoQuery } from "@/lib/hono-client";

export type StylesListParams = InferRequestType<
  (typeof apiClient)["workspaces"][":workspaceSlug"]["styles"]["$get"]
>["query"];

type StyleCreateInput = InferRequestType<
  (typeof apiClient)["workspaces"][":workspaceSlug"]["styles"]["$post"]
>["json"];

type StyleUpdateInput = InferRequestType<
  (typeof apiClient)["workspaces"][":workspaceSlug"]["styles"][":styleId"]["$patch"]
>["json"];

export type StylesListResponse = InferResponseType<
  (typeof apiClient)["workspaces"][":workspaceSlug"]["styles"]["$get"]
>;

export type StyleResponse = InferResponseType<
  (typeof apiClient)["workspaces"][":workspaceSlug"]["styles"][":styleId"]["$get"]
>;

export const invalidateStylesListQueries = async (queryClient: QueryClient) => {
  await queryClient.invalidateQueries({
    predicate: (query) =>
      Array.isArray(query.queryKey) &&
      (query.queryKey[0] === "styles-list" ||
        query.queryKey[0] === "styles-list-infinite"),
    type: "all",
  });
};

export const useStylesListQuery = (params: StylesListParams = {}) => {
  const { workspace } = useWorkspace();

  return useHonoQuery<StylesListResponse>({
    queryKey: ["styles-list", params],
    queryFn: (api) =>
      api.workspaces[":workspaceSlug"].styles.$get({
        param: { workspaceSlug: workspace.slug },
        query: params,
      }),
  });
};

export const useStylesInfiniteQuery = (
  params: Omit<StylesListParams, "page"> = {},
) => {
  const { workspace } = useWorkspace();

  return useInfiniteQuery({
    queryKey: ["styles-list-infinite", params],
    queryFn: async ({ pageParam }) => {
      const response = await apiClient.workspaces[":workspaceSlug"].styles.$get(
        {
          param: { workspaceSlug: workspace.slug },
          query: { ...params, page: String(pageParam) },
        },
      );
      return await response.json();
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      return lastPage.pagination.hasNextPage
        ? lastPage.pagination.page + 1
        : undefined;
    },
  });
};

export const useStyleDetailsQuery = (styleId: string | undefined) => {
  const { workspace } = useWorkspace();

  return useHonoQuery<StyleResponse>({
    queryKey: ["style", styleId],
    enabled: Boolean(styleId),
    queryFn: (api) =>
      api.workspaces[":workspaceSlug"].styles[":styleId"].$get({
        // biome-ignore lint/style/noNonNullAssertion: later
        param: { workspaceSlug: workspace.slug, styleId: styleId! },
      }),
  });
};

export const useStyleCreateMutation = (onSuccess?: () => void) => {
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();

  return useHonoMutation({
    mutationFn: (api, data: StyleCreateInput) =>
      api.workspaces[":workspaceSlug"].styles.$post({
        param: { workspaceSlug: workspace.slug },
        json: data,
      }),
    onSuccess: async () => {
      await invalidateStylesListQueries(queryClient);
      toast.success("Style created");
      onSuccess?.();
    },
  });
};

export const useStyleUpdateMutation = (onSuccess?: () => void) => {
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();

  return useHonoMutation({
    mutationFn: (api, variables: { styleId: string; data: StyleUpdateInput }) =>
      api.workspaces[":workspaceSlug"].styles[":styleId"].$patch({
        param: {
          workspaceSlug: workspace.slug,
          styleId: variables.styleId,
        },
        json: variables.data,
      }),
    onSuccess: async (_data, variables) => {
      await invalidateStylesListQueries(queryClient);
      await queryClient.invalidateQueries({
        queryKey: ["style", variables.styleId],
      });
      toast.success("Style updated");
      onSuccess?.();
    },
  });
};

export const useStyleDeleteMutation = (onSuccess?: () => void) => {
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();

  return useHonoMutation({
    mutationFn: (api, styleId: string) =>
      api.workspaces[":workspaceSlug"].styles[":styleId"].$delete({
        param: { workspaceSlug: workspace.slug, styleId },
      }),
    onSuccess: async (_data, styleId) => {
      await invalidateStylesListQueries(queryClient);
      await queryClient.invalidateQueries({ queryKey: ["style", styleId] });
      toast.success("Style deleted");
      onSuccess?.();
    },
  });
};
