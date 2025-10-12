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

export type StyleGenerationsParams = InferRequestType<
  (typeof apiClient)["workspaces"][":workspaceSlug"]["styles"][":styleId"]["generations"]["$get"]
>["query"];

export type StyleGenerationsResponse = InferResponseType<
  (typeof apiClient)["workspaces"][":workspaceSlug"]["styles"][":styleId"]["generations"]["$get"]
>;

const serializeStylesListParams = (params: Partial<StylesListParams> = {}) => {
  const query: Record<string, string | string[] | object> = {};

  if ("page" in params && params.page != null) {
    query.page = String(params.page);
  }
  if ("pageSize" in params && params.pageSize != null) {
    query.pageSize = String(params.pageSize);
  }
  if ("search" in params && params.search) {
    query.search = params.search;
  }
  if ("officialOnly" in params && params.officialOnly != null) {
    query.officialOnly = String(params.officialOnly);
  }
  if ("sort" in params && params.sort) {
    query.sort = params.sort;
  }
  if ("order" in params && params.order) {
    query.order = params.order;
  }

  return query;
};

const serializeStyleGenerationsParams = (
  params: Partial<StyleGenerationsParams> = {},
) => {
  const query: Record<string, unknown> = {};

  if ("page" in params && params.page != null) {
    query.page = String(params.page);
  }
  if ("pageSize" in params && params.pageSize != null) {
    query.pageSize = String(params.pageSize);
  }
  if ("productId" in params && params.productId) {
    query.productId = params.productId;
  }
  if ("productOnly" in params && params.productOnly != null) {
    query.productOnly = String(params.productOnly);
  }

  return query;
};

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
        query: serializeStylesListParams(params),
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
      const query = serializeStylesListParams(params);
      query.page = String(pageParam);

      const response = await apiClient.workspaces[":workspaceSlug"].styles.$get(
        {
          param: { workspaceSlug: workspace.slug },
          query,
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

export const useStyleGenerationsQuery = (
  styleId: string | undefined,
  params: StyleGenerationsParams = {},
) => {
  const { workspace } = useWorkspace();

  return useHonoQuery<StyleGenerationsResponse>({
    queryKey: ["style-generations", styleId, params],
    enabled: Boolean(styleId),
    queryFn: (api) =>
      api.workspaces[":workspaceSlug"].styles[":styleId"].generations.$get({
        // biome-ignore lint/style/noNonNullAssertion: later
        param: { workspaceSlug: workspace.slug, styleId: styleId! },
        query: serializeStyleGenerationsParams(params),
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
