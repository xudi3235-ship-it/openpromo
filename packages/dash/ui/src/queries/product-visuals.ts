import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useWorkspace } from "@/hooks/useWorkspace";
import { orpc } from "@/lib/orpc-client";
import type {
  ProductVisualsRouterInputs,
  ProductVisualsRouterOutputs,
} from "../../../worker/src/orpc/routes/product-visuals";

export type ProductVisualsFeedInput = Omit<
  ProductVisualsRouterInputs["feed"],
  "workspaceId" | "workspaceSlug"
>;
export type ProductVisualsFeedResponse = ProductVisualsRouterOutputs["feed"];

export type ProductVisualsBatchDeleteInput = Omit<
  ProductVisualsRouterInputs["batchDelete"],
  "workspaceId" | "workspaceSlug"
>;
export type ProductVisualsBatchDeleteResponse =
  ProductVisualsRouterOutputs["batchDelete"];

export const useProductVisualsFeedQuery = (
  params: ProductVisualsFeedInput = { page: 1, pageSize: 18 },
  options?: { enabled?: boolean },
) => {
  const { workspace } = useWorkspace();

  const queryOptions = orpc.productVisuals.feed.queryOptions({
    input: {
      ...params,
      workspaceSlug: workspace.slug,
    },
  });

  return useQuery({
    ...queryOptions,
    enabled: options?.enabled ?? queryOptions.enabled ?? true,
  });
};

export const useProductVisualsBatchDeleteMutation = (
  onSuccess?: () => void,
) => {
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation<
    ProductVisualsBatchDeleteResponse,
    Error,
    ProductVisualsBatchDeleteInput
  >({
    mutationFn: async (variables) =>
      orpc.productVisuals.batchDelete.call({
        ...variables,
        workspaceSlug: workspace.slug,
      }),
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({
        queryKey: orpc.productVisuals.feed.key(),
      });
      toast.success(
        `Deleted ${data.deletedCount} item${data.deletedCount !== 1 ? "s" : ""}`,
      );
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete items");
    },
  });
};
