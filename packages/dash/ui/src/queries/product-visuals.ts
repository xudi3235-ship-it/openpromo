import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useWorkspace } from "@/hooks/useWorkspace";
import { orpc } from "@/lib/orpc-client";
import type {
  ProductVisualsRouterInputs,
  ProductVisualsRouterOutputs,
} from "../../../worker/src/orpc/routes/product-visuals";

export type ProductVisualsBatchDeleteInput = Omit<
  ProductVisualsRouterInputs["batchDelete"],
  "workspaceId" | "workspaceSlug"
>;
export type ProductVisualsBatchDeleteResponse =
  ProductVisualsRouterOutputs["batchDelete"];

export const useProductVisualsBatchDeleteMutation = (
  onSuccess?: () => void,
) => {
  const { workspace } = useWorkspace();

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

export const usePresetsQuery = () => {
  const { workspace } = useWorkspace();
  return useQuery(
    orpc.productVisuals.presets.queryOptions({
      input: {
        workspaceSlug: workspace.slug,
      },
    }),
  );
};
