import type { QueryClient } from "@tanstack/react-query";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useWorkspace } from "@/hooks/useWorkspace";
import { orpc } from "@/lib/orpc-client";
import { useComposerStore } from "@/stores/composer-store";
import type {
  ContentGroupsRouterInputs,
  ContentGroupsRouterOutputs,
  ContentRouterInputs,
  ContentRouterOutputs,
} from "../../../worker/src/orpc/routes/content";

// Type definitions
export type ContentListParams = Omit<
  ContentRouterInputs["list"],
  "workspaceId" | "workspaceSlug"
>;
export type ContentListResponse = ContentRouterOutputs["list"];

export type ContentDetailParams = Omit<
  ContentRouterInputs["get"],
  "workspaceId" | "workspaceSlug"
>;
export type ContentDetailResponse = ContentRouterOutputs["get"];

export type ContentCreateInput = Omit<
  ContentRouterInputs["create"],
  "workspaceId" | "workspaceSlug"
>;

export type ContentDeleteInput = Omit<
  ContentRouterInputs["delete"],
  "workspaceId" | "workspaceSlug"
>;

export type ContentBatchDeleteInput = Omit<
  ContentRouterInputs["batchDelete"],
  "workspaceId" | "workspaceSlug"
>;

// Content group types
export type ContentGroupGetInput = Omit<
  ContentGroupsRouterInputs["get"],
  "workspaceId" | "workspaceSlug"
>;

export type ContentGroupUpdateInput = Omit<
  ContentGroupsRouterInputs["update"],
  "workspaceId" | "workspaceSlug"
>;

export type ContentGroupGetResponse = ContentGroupsRouterOutputs["get"];

const defaultListContentParams: ContentListParams = {
  page: 1,
  pageSize: 20,
  sortBy: "createdAt",
  sortOrder: "desc",
};

// Query invalidation
export const invalidateContentListQueries = async (
  queryClient: QueryClient,
) => {
  await queryClient.invalidateQueries({
    queryKey: orpc.content.list.key(),
  });
};

export const invalidateContentGroupQueries = async (
  queryClient: QueryClient,
) => {
  await queryClient.invalidateQueries({
    queryKey: orpc.content.groups.key(),
  });
};

// Prefetch functions
export const prefetchContentList = (
  queryClient: QueryClient,
  workspaceSlug: string,
  params: ContentListParams = defaultListContentParams,
) => {
  // do not await
  queryClient.prefetchQuery(
    orpc.content.list.queryOptions({
      input: {
        ...params,
        workspaceSlug,
      },
    }),
  );
};

export const prefetchContentDetail = (
  queryClient: QueryClient,
  workspaceSlug: string,
  contentId: string,
) => {
  // do not await so we can hydrate when route loads
  queryClient.prefetchQuery(
    orpc.content.get.queryOptions({
      input: {
        workspaceSlug,
        contentId,
      },
    }),
  );
};

// Query hooks
export const useContentListQuery = (
  params: ContentListParams = defaultListContentParams,
) => {
  const { workspace } = useWorkspace();

  return useQuery(
    orpc.content.list.queryOptions({
      input: {
        ...params,
        workspaceSlug: workspace.slug,
      },
    }),
  );
};

export const useContentDetailQuery = (contentId?: string) => {
  const { workspace } = useWorkspace();

  return useQuery(
    orpc.content.get.queryOptions({
      input: {
        workspaceSlug: workspace.slug,
        contentId: contentId ?? "",
      },
      enabled: Boolean(contentId),
    }),
  );
};

// Content group query
export const useContentGroupQuery = (contentGroupId: string | undefined) => {
  const { workspace } = useWorkspace();

  return useQuery(
    orpc.content.groups.get.queryOptions({
      input: {
        contentGroupId: contentGroupId || "",
        workspaceSlug: workspace.slug,
      },
      enabled: Boolean(contentGroupId),
    }),
  );
};

// Mutation hooks
export const useContentCreateMutationBasic = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();
  const { workspace } = useWorkspace();

  return useMutation(
    orpc.content.create.mutationOptions({
      onSuccess: async (_data) => {
        await invalidateContentListQueries(queryClient);
        toast.success("Content created successfully");
        onSuccess?.();
      },
      mutationFn: async (input) => {
        return orpc.content.create.call({
          ...input,
          workspaceId: workspace.id,
          workspaceSlug: workspace.slug,
        });
      },
      onError: (error) => {
        toast.error(error.message || "Failed to create content");
      },
    }),
  );
};

export const useContentDeleteMutation = (onSuccess?: () => void) => {
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    ...orpc.content.delete.mutationOptions({
      mutationFn: async (variables) =>
        orpc.content.delete.call({
          ...variables,
          workspaceId: workspace.id,
          workspaceSlug: workspace.slug,
        }),
      onSuccess: async () => {
        await invalidateContentListQueries(queryClient);
        toast.success("Content deleted");
        onSuccess?.();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to delete content");
      },
    }),
  });
};

export const useContentBatchDeleteMutation = (onSuccess?: () => void) => {
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation(
    orpc.content.batchDelete.mutationOptions({
      mutationFn: async (variables) =>
        orpc.content.batchDelete.call({
          ...variables,
          workspaceId: workspace.id,
          workspaceSlug: workspace.slug,
        }),
      onSuccess: async (data) => {
        await invalidateContentListQueries(queryClient);

        if (data.success) {
          toast.success(`Successfully deleted ${data.deleted} item(s)`);
        } else {
          toast.warning("Some items could not be deleted");
        }
        onSuccess?.();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to delete content");
      },
    }),
  );
};

// Content group mutations
export const useContentGroupUpdateMutation = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();
  const { workspace } = useWorkspace();

  return useMutation(
    orpc.content.groups.update.mutationOptions({
      onSuccess: async (_data, variables) => {
        await invalidateContentListQueries(queryClient);
        await invalidateContentGroupQueries(queryClient);
        await queryClient.invalidateQueries({
          queryKey: orpc.content.groups.get.key({
            input: { contentGroupId: variables.contentGroupId },
          }),
        });
        toast.success("Content group updated");
        onSuccess?.();
      },
      mutationFn: async (input) => {
        return orpc.content.groups.update.call({
          ...input,
          workspaceId: workspace.id,
          workspaceSlug: workspace.slug,
        });
      },
      onError: (error) => {
        toast.error(error.message || "Failed to update content group");
      },
    }),
  );
};

export const useContentGroupPublishMutation = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();
  const { workspace } = useWorkspace();

  return useMutation(
    orpc.content.groups.publish.mutationOptions({
      onSuccess: async (_data, variables) => {
        await invalidateContentListQueries(queryClient);
        await invalidateContentGroupQueries(queryClient);
        await queryClient.invalidateQueries({
          queryKey: orpc.content.groups.get.key({
            input: { contentGroupId: variables.contentGroupId },
          }),
        });
        toast.success("Content group published");
        onSuccess?.();
      },
      mutationFn: async (input) => {
        return orpc.content.groups.publish.call({
          ...input,
          workspaceId: workspace.id,
          workspaceSlug: workspace.slug,
        });
      },
      onError: (error) => {
        toast.error(error.message || "Failed to publish content group");
      },
    }),
  );
};

export const useContentGroupDeleteMutation = (onSuccess?: () => void) => {
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    ...orpc.content.groups.delete.mutationOptions({
      mutationFn: async (variables) =>
        orpc.content.groups.delete.call({
          ...variables,
          workspaceId: workspace.id,
          workspaceSlug: workspace.slug,
        }),
      onSuccess: async () => {
        await invalidateContentListQueries(queryClient);
        await invalidateContentGroupQueries(queryClient);
        toast.success("Content group deleted");
        onSuccess?.();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to delete content group");
      },
    }),
  });
};

// Composer mutations that work with the composer store
export function useContentCreateMutation({
  onSuccess,
  onError,
}: {
  onSuccess?: () => void;
  onError?: () => void;
} = {}) {
  const { workspace } = useWorkspace();
  const { contentCreateData } = useComposerStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      return orpc.content.create.call({
        ...contentCreateData,
        workspaceId: workspace.id,
        workspaceSlug: workspace.slug,
      });
    },
    onSuccess: async () => {
      await invalidateContentListQueries(queryClient);
      toast.success("Content created successfully");
      onSuccess?.();
    },
    onError: (error) => {
      onError?.();
      toast.error(error.message || "Failed to create content");
    },
  });
}

export function usePendingContentGroupPatchMutation({
  onSuccess,
  onError,
}: {
  onSuccess?: () => void;
  onError?: () => void;
} = {}) {
  const { workspace } = useWorkspace();
  const { contentCreateData } = useComposerStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contentGroupId: string) => {
      return orpc.content.groups.update.call({
        contentGroupId,
        data: contentCreateData,
        workspaceId: workspace.id,
        workspaceSlug: workspace.slug,
      });
    },
    onSuccess: async (_data, contentGroupId) => {
      await invalidateContentListQueries(queryClient);
      await invalidateContentGroupQueries(queryClient);
      await queryClient.invalidateQueries({
        queryKey: orpc.content.groups.get.key({
          input: { contentGroupId },
        }),
      });
      onSuccess?.();
    },
    onError: (error) => {
      onError?.();
      toast.error(error.message || "Failed to update content group");
    },
  });
}

export function useComposerMutations() {
  return {
    create: useContentCreateMutation,
    updateGroup: usePendingContentGroupPatchMutation,
  };
}

// Legacy export for backward compatibility during migration
export {
  useContentListQuery as useContentQuery,
  useContentGroupQuery as useContentGroupQueryLegacy,
  useContentCreateMutationBasic as useContentCreateMutationLegacy,
  useContentDeleteMutation as useContentDeleteMutationLegacy,
  useContentGroupDeleteMutation as useContentGroupDeleteMutationLegacy,
  useContentGroupUpdateMutation as useContentGroupUpdateMutationLegacy,
  useContentGroupPublishMutation as useContentGroupPublishMutationLegacy,
  useContentBatchDeleteMutation as useBatchDeleteMutation,
  invalidateContentListQueries as invalidateContentQueries,
  invalidateContentGroupQueries as invalidateContentGroupQueriesLegacy,
  prefetchContentList as prefetchContent,
};
