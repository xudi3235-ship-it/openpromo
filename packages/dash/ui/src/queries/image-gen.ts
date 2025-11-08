import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useWorkspace } from "@/hooks/useWorkspace";
import { orpc } from "@/lib/orpc-client";
import type {
  ImageGenRouterInputs,
  ImageGenRouterOutputs,
} from "../../../worker/src/orpc/routes/image-gen";

export type ImageGenListParams = Omit<
  ImageGenRouterInputs["list"],
  "workspaceId" | "workspaceSlug"
>;
export type ImageGenListResponse = ImageGenRouterOutputs["list"];
type ImageGenDeleteBatchInput = Omit<
  ImageGenRouterInputs["deleteBatch"],
  "workspaceId" | "workspaceSlug"
>;

export const useImageGenListQuery = (params: ImageGenListParams = {}) => {
  const { workspace } = useWorkspace();

  return useQuery(
    orpc.imageGen.list.queryOptions({
      input: {
        ...params,
        workspaceSlug: workspace.slug,
      },
    }),
  );
};

export const useImageGenDeleteBatchMutation = (onSuccess?: () => void) => {
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation(
    orpc.imageGen.deleteBatch.mutationOptions({
      mutationFn: async (input: ImageGenDeleteBatchInput) =>
        orpc.imageGen.deleteBatch.call({
          ...input,
          workspaceSlug: workspace.slug,
        }),
      onSuccess: async (data) => {
        await queryClient.invalidateQueries({
          queryKey: orpc.imageGen.list.key(),
        });
        toast.success(
          `Deleted ${data.deletedCount} generation${data.deletedCount !== 1 ? "s" : ""}`,
        );
        onSuccess?.();
      },
    }),
  );
};
