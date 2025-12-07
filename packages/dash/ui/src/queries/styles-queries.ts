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

// Query options factories - these create the options that both prefetch and hooks use
const getStylesListOptions = (
  workspaceSlug: string,
  params: StylesListParams = {},
) => orpc.styles.list.queryOptions({ input: { ...params, workspaceSlug } });

const getStylesInfiniteOptions = (
  workspaceSlug: string,
  params: Omit<StylesListParams, "page"> = {},
) =>
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
  });

const getStyleDetailsOptions = (workspaceSlug: string, styleId: string) =>
  orpc.styles.get.queryOptions({ input: { workspaceSlug, styleId } });

const getStyleGenerationsInfiniteOptions = (
  workspaceSlug: string,
  styleId: string,
  params: Omit<StyleGenerationsParams, "page"> = {},
) =>
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
  });

// Prefetch helpers for loaders (use factory functions)
export const prefetchStylesList = (
  queryClient: QueryClient,
  workspaceSlug: string,
  params: StylesListParams = {},
) => {
  queryClient.prefetchQuery(getStylesListOptions(workspaceSlug, params));
};

export const prefetchStylesInfiniteQuery = (
  queryClient: QueryClient,
  workspaceSlug: string,
  params: Omit<StylesListParams, "page"> = {},
) => {
  queryClient.prefetchInfiniteQuery(
    getStylesInfiniteOptions(workspaceSlug, params),
  );
};

export const prefetchStyleDetails = (
  queryClient: QueryClient,
  workspaceSlug: string,
  styleId: string,
) => {
  queryClient.prefetchQuery(getStyleDetailsOptions(workspaceSlug, styleId));
};

export const prefetchStyleGenerationsInfiniteQuery = (
  queryClient: QueryClient,
  workspaceSlug: string,
  styleId: string,
  params: Omit<StyleGenerationsParams, "page"> = {},
) => {
  queryClient.prefetchInfiniteQuery(
    getStyleGenerationsInfiniteOptions(workspaceSlug, styleId, params),
  );
};

// Hooks for components - return both query result and prefetch function
export const useStylesListQuery = (params: StylesListParams = {}) => {
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();

  return {
    ...useQuery(getStylesListOptions(workspace.slug, params)),
    prefetch: (overrideParams?: StylesListParams) =>
      queryClient.prefetchQuery(
        getStylesListOptions(workspace.slug, overrideParams ?? params),
      ),
  };
};

export const useStylesInfiniteQuery = (
  params: Omit<StylesListParams, "page"> = {},
) => {
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();

  return {
    ...useInfiniteQuery(getStylesInfiniteOptions(workspace.slug, params)),
    prefetch: (overrideParams?: Omit<StylesListParams, "page">) =>
      queryClient.prefetchInfiniteQuery(
        getStylesInfiniteOptions(workspace.slug, overrideParams ?? params),
      ),
  };
};

export const useStyleDetailsQuery = (styleId: string | undefined) => {
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();

  return {
    ...useQuery({
      ...getStyleDetailsOptions(
        workspace.slug,
        // biome-ignore lint/style/noNonNullAssertion: later
        styleId!,
      ),
      enabled: Boolean(styleId),
    }),
    prefetch: (overrideStyleId?: string) => {
      const id = overrideStyleId ?? styleId;
      if (!id) return;
      return queryClient.prefetchQuery(
        getStyleDetailsOptions(workspace.slug, id),
      );
    },
  };
};

export const useStyleGenerationsQuery = (
  styleId: string | undefined,
  params: StyleGenerationsParams = {},
) => {
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();

  return {
    ...useQuery(
      orpc.styles.generations.list.queryOptions({
        input: {
          ...params,
          workspaceSlug: workspace.slug,
          // biome-ignore lint/style/noNonNullAssertion: later
          styleId: styleId!,
        },
        enabled: Boolean(styleId),
      }),
    ),
    prefetch: (overrideParams?: StyleGenerationsParams) => {
      if (!styleId) return;
      return queryClient.prefetchQuery(
        orpc.styles.generations.list.queryOptions({
          input: {
            ...(overrideParams ?? params),
            workspaceSlug: workspace.slug,
            styleId,
          },
        }),
      );
    },
  };
};

export const useStyleGenerationsInfiniteQuery = (
  styleId: string | undefined,
  params: Omit<StyleGenerationsParams, "page"> = {},
) => {
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();

  return {
    ...useInfiniteQuery({
      ...getStyleGenerationsInfiniteOptions(
        workspace.slug,
        // biome-ignore lint/style/noNonNullAssertion: later
        styleId!,
        params,
      ),
      enabled: Boolean(styleId),
    }),
    prefetch: (overrideParams?: Omit<StyleGenerationsParams, "page">) => {
      if (!styleId) return;
      return queryClient.prefetchInfiniteQuery(
        getStyleGenerationsInfiniteOptions(
          workspace.slug,
          styleId,
          overrideParams ?? params,
        ),
      );
    },
  };
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
  const { workspace } = useWorkspace();

  return useMutation(
    orpc.styles.create.mutationOptions({
      onSuccess: async () => {
        await invalidateStylesListQueries(queryClient);
        toast.success("Style created");
        onSuccess?.();
      },
      mutationFn: async (input) => {
        return orpc.styles.create.call({
          ...input,
          workspaceId: workspace.id,
        });
      },
    }),
  );
};

export const useStyleUpdateMutation = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();
  const { workspace } = useWorkspace();

  return useMutation(
    orpc.styles.update.mutationOptions({
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
      mutationFn: async (input) => {
        return orpc.styles.update.call({
          ...input,
          workspaceId: workspace.id,
        });
      },
    }),
  );
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

export const useStyleCreateManyMutation = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();
  const { workspace } = useWorkspace();

  return useMutation(
    orpc.styles.createMany.mutationOptions({
      onSuccess: async (data) => {
        await invalidateStylesListQueries(queryClient);
        toast.success(`Created ${data.styles.length} style(s)`);
        onSuccess?.();
      },
      mutationFn: async (input) => {
        return orpc.styles.createMany.call({
          ...input,
          workspaceId: workspace.id,
        });
      },
    }),
  );
};
