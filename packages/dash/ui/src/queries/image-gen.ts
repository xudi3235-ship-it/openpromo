import { useQueryClient } from "@tanstack/react-query";
import type { InferRequestType, InferResponseType } from "hono/client";
import { toast } from "sonner";
import { useWorkspace } from "@/hooks/useWorkspace";
import {
  type apiClient,
  useHonoMutation,
  useHonoQuery,
} from "@/lib/hono-client";

type ImageGenListParams = InferRequestType<
  (typeof apiClient)["workspaces"][":workspaceSlug"]["image-gen"]["$get"]
>["query"];

export type ImageGenListResponse = InferResponseType<
  (typeof apiClient)["workspaces"][":workspaceSlug"]["image-gen"]["$get"]
>;

type ImageGenDeleteBatchInput = InferRequestType<
  (typeof apiClient)["workspaces"][":workspaceSlug"]["image-gen"]["delete-batch"]["$post"]
>["json"];

export const useImageGenListQuery = (params: ImageGenListParams = {}) => {
  const { workspace } = useWorkspace();

  return useHonoQuery({
    queryKey: ["image-gen-list", params],
    queryFn: (api) =>
      api.workspaces[":workspaceSlug"]["image-gen"].$get({
        query: params,
        param: { workspaceSlug: workspace.slug },
      }),
  });
};

export const useImageGenDeleteBatchMutation = (onSuccess?: () => void) => {
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();

  return useHonoMutation({
    mutationFn: (api, data: ImageGenDeleteBatchInput) =>
      api.workspaces[":workspaceSlug"]["image-gen"]["delete-batch"].$post({
        param: { workspaceSlug: workspace.slug },
        json: data,
      }),
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ["image-gen-list"] });
      toast.success(
        `Deleted ${data.deletedCount} generation${data.deletedCount !== 1 ? "s" : ""}`,
      );
      onSuccess?.();
    },
  });
};
