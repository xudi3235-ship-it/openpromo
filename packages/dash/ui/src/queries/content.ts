import type { QueryClient } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useHonoMutation, useHonoQuery } from "@/lib/hono-client";
import { QUERY_KEYS } from "@/lib/query";
import { useComposerStore } from "@/stores/composer-store";

export const invalidateContentListQueries = async (queryClient: QueryClient) =>
  queryClient.invalidateQueries({
    predicate: (query) =>
      Array.isArray(query.queryKey) && query.queryKey[0] === "content-list",
    type: "all",
  });

export interface ContentListPaginationParams {
  page?: number;
  pageSize?: number;
  publishingStatus?: string;
  fromDate?: Date;
  toDate?: Date;
}

export const useContentListQuery = (
  params: ContentListPaginationParams = {},
) => {
  const { workspace } = useWorkspace();
  const {
    page = 1,
    pageSize = 20,
    publishingStatus,
    fromDate,
    toDate,
  } = params;

  const queryParams: Record<string, string> = {
    page: page.toString(),
    pageSize: pageSize.toString(),
  };

  if (publishingStatus) {
    queryParams.publishingStatus = publishingStatus;
  }

  if (fromDate) {
    queryParams.fromDate = fromDate.toISOString();
  }

  if (toDate) {
    queryParams.toDate = toDate.toISOString();
  }

  return useHonoQuery({
    queryKey: [
      "content-list",
      page,
      pageSize,
      publishingStatus,
      fromDate?.toISOString(),
      toDate?.toISOString(),
    ],
    queryFn: (api) =>
      api.workspaces[":workspaceSlug"].content.$get({
        query: queryParams,
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
    onSettled: async () => {
      await invalidateContentListQueries(queryClient);
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
      await invalidateContentListQueries(queryClient);
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
      await invalidateContentListQueries(queryClient);
      toast.success("Content deleted");
    },
    onSettled: () => {
      onSettled?.();
    },
  });
};

export const useBatchDeleteMutation = (onSettled?: () => void) => {
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();

  return useHonoMutation({
    mutationFn: (api, ids: string[]) =>
      api.workspaces[":workspaceSlug"].content.batch.$delete({
        param: { workspaceSlug: workspace.slug },
        json: { ids },
      }),
    onSuccess: async (data) => {
      await invalidateContentListQueries(queryClient);

      if (data.success) {
        toast.success(`Successfully deleted ${data.deleted} item(s)`);
      } else {
        toast.warning(
          `Deleted ${data.deleted} item(s), failed to delete ${data.failed} item(s)`,
        );
      }
    },
    onSettled: () => {
      onSettled?.();
    },
  });
};

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

  return useHonoMutation({
    mutationFn: (api) =>
      api.workspaces[":workspaceSlug"].content.create.$post({
        param: { workspaceSlug: workspace.slug },
        json: contentCreateData,
      }),
    onSuccess: async () => {
      await invalidateContentListQueries(queryClient);
      onSuccess?.();
    },
    onError: () => {
      onError?.();
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

  return useHonoMutation({
    mutationFn: (api, contentID: string) =>
      api.workspaces[":workspaceSlug"].content.group[":id"].$patch({
        param: { workspaceSlug: workspace.slug, id: contentID },
        json: contentCreateData,
      }),
    onSuccess: async (_data, contentID) => {
      await invalidateContentListQueries(queryClient);
      if (contentID) {
        await queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.CONTENT_GROUP(contentID),
        });
      }
      onSuccess?.();
    },
    onError: () => {
      onError?.();
    },
  });
}

export function useComposerMutations() {
  return {
    create: useContentCreateMutation,
    updateGroup: usePendingContentGroupPatchMutation,
  };
}
