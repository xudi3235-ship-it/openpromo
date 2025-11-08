import type { QueryClient } from "@tanstack/react-query";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { useWorkspace } from "@/hooks/useWorkspace";
import { orpc } from "@/lib/orpc-client";
import type {
  StyleRouterInputs,
  StyleRouterOutputs,
} from "../../../worker/src/orpc/routes/styles";

export type StylesListParams = Omit<StyleRouterInputs["list"], "workspaceSlug">;
export type StylesListResponse = StyleRouterOutputs["list"];
export type StyleResponse = StyleRouterOutputs["get"];
export type StyleGenerationsParams = Omit<
  StyleRouterInputs["generations"]["list"],
  "workspaceSlug" | "styleId"
>;
export type StyleGenerationsResponse =
  StyleRouterOutputs["generations"]["list"];

export const invalidateStylesListQueries = async (queryClient: QueryClient) => {
  await queryClient.invalidateQueries({
    queryKey: orpc.styles.list.key(),
  });
};

export const prefetchStylesList = (
  queryClient: QueryClient,
  workspaceSlug: string,
  params: StylesListParams = {},
) => {
  // do not await
  queryClient.prefetchQuery(
    orpc.styles.list.queryOptions({ input: { ...params, workspaceSlug } }),
  );
};

export const prefetchStylesInfiniteQuery = (
  queryClient: QueryClient,
  workspaceSlug: string,
  params: Omit<StylesListParams, "page"> = {},
) => {
  // do not await
  queryClient.prefetchInfiniteQuery(
    orpc.styles.list.infiniteOptions({
      input: (pageParam) => ({
        ...params,
        workspaceSlug,
        page: pageParam,
      }),
      initialPageParam: 1,
      getNextPageParam: (lastPage) => {
        return lastPage.pagination.hasNextPage
          ? lastPage.pagination.page + 1
          : undefined;
      },
    }),
  );
};

export const prefetchStyleDetails = (
  queryClient: QueryClient,
  workspaceSlug: string,
  styleId: string,
) => {
  // do not await
  queryClient.prefetchQuery(
    orpc.styles.get.queryOptions({ input: { workspaceSlug, styleId } }),
  );
};

export const prefetchStyleGenerationsInfiniteQuery = (
  queryClient: QueryClient,
  workspaceSlug: string,
  styleId: string,
  params: Omit<StyleGenerationsParams, "page"> = {},
) => {
  // do not await
  queryClient.prefetchInfiniteQuery(
    orpc.styles.generations.list.infiniteOptions({
      input: (pageParam) => ({
        ...params,
        workspaceSlug,
        styleId,
        page: pageParam,
      }),
      initialPageParam: 1,
      getNextPageParam: (lastPage) => {
        const { page, totalPages } = lastPage.pagination;
        return page < totalPages ? page + 1 : undefined;
      },
    }),
  );
};

export const useStylesListQuery = (params: StylesListParams = {}) => {
  const { workspace } = useWorkspace();

  return useQuery(
    orpc.styles.list.queryOptions({
      input: {
        ...params,
        workspaceSlug: workspace.slug,
      },
    }),
  );
};

export const useStylesInfiniteQuery = (
  params: Omit<StylesListParams, "page"> = {},
) => {
  const { workspace } = useWorkspace();

  return useInfiniteQuery(
    orpc.styles.list.infiniteOptions({
      input: (pageParam) => ({
        ...params,
        workspaceSlug: workspace.slug,
        page: pageParam,
      }),
      initialPageParam: 1,
      getNextPageParam: (lastPage) => {
        return lastPage.pagination.hasNextPage
          ? lastPage.pagination.page + 1
          : undefined;
      },
    }),
  );
};

export const useStyleDetailsQuery = (styleId: string | undefined) => {
  const { workspace } = useWorkspace();

  return useQuery(
    orpc.styles.get.queryOptions({
      input: {
        workspaceSlug: workspace.slug,
        // biome-ignore lint/style/noNonNullAssertion: later
        styleId: styleId!,
      },
      enabled: Boolean(styleId),
    }),
  );
};

export const useStyleGenerationsQuery = (
  styleId: string | undefined,
  params: StyleGenerationsParams = {},
) => {
  const { workspace } = useWorkspace();

  return useQuery(
    orpc.styles.generations.list.queryOptions({
      input: {
        ...params,
        workspaceSlug: workspace.slug,
        // biome-ignore lint/style/noNonNullAssertion: later
        styleId: styleId!,
      },
      enabled: Boolean(styleId),
    }),
  );
};

export const useStyleGenerationsInfiniteQuery = (
  styleId: string | undefined,
  params: Omit<StyleGenerationsParams, "page"> = {},
) => {
  const { workspace } = useWorkspace();

  return useInfiniteQuery(
    orpc.styles.generations.list.infiniteOptions({
      input: (pageParam) => ({
        ...params,
        workspaceSlug: workspace.slug,
        // biome-ignore lint/style/noNonNullAssertion: later
        styleId: styleId!,
        page: pageParam,
      }),
      enabled: Boolean(styleId),
      initialPageParam: 1,
      getNextPageParam: (lastPage) => {
        const { page, totalPages } = lastPage.pagination;
        return page < totalPages ? page + 1 : undefined;
      },
    }),
  );
};

export const useStyleGenerationDeleteMutation = (styleId?: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    ...orpc.styles.generations.delete.mutationOptions({
      onSuccess: async () => {
        if (!styleId) return;
        await queryClient.invalidateQueries({
          queryKey: orpc.styles.generations.list.key({ input: { styleId } }),
        });
        toast.success("Generation deleted");
      },
      onError: () => {
        toast.error("Failed to delete generation");
      },
    }),
  });
};

export const useStyleCreateMutation = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();

  return useMutation({
    ...orpc.styles.create.mutationOptions({
      onSuccess: async () => {
        await invalidateStylesListQueries(queryClient);
        toast.success("Style created");
        onSuccess?.();
      },
    }),
  });
};

export const useStyleUpdateMutation = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();

  return useMutation({
    ...orpc.styles.update.mutationOptions({
      onSuccess: async (_data, variables) => {
        await invalidateStylesListQueries(queryClient);
        await queryClient.invalidateQueries({
          queryKey: orpc.styles.get.key({
            input: { styleId: variables.styleId },
          }),
        });
        toast.success("Style updated");
        onSuccess?.();
      },
    }),
  });
};

export const useStyleDeleteMutation = (onSuccess?: () => void) => {
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    ...orpc.styles.delete.mutationOptions({
      onSuccess: async () => {
        await invalidateStylesListQueries(queryClient);
        await queryClient.invalidateQueries({
          queryKey: orpc.styles.list.key({
            input: { workspaceId: workspace.id },
          }),
        });
        toast.success("Style deleted");
        onSuccess?.();
      },
    }),
  });
};
