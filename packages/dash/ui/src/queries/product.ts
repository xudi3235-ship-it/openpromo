import type { QueryClient } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import type { InferRequestType, InferResponseType } from "hono/client";
import { toast } from "sonner";
import { useWorkspace } from "@/hooks/useWorkspace";
import { apiClient, useHonoMutation, useHonoQuery } from "@/lib/hono-client";

type ProductCreateInput = InferRequestType<
  (typeof apiClient)["workspaces"][":workspaceSlug"]["products"]["$post"]
>["json"];

type ProductUpdateInput = InferRequestType<
  (typeof apiClient)["workspaces"][":workspaceSlug"]["products"][":id"]["$patch"]
>["json"];

type ProductListParams = InferRequestType<
  (typeof apiClient)["workspaces"][":workspaceSlug"]["products"]["$get"]
>["query"];

export type ProductImageGenerateInput = InferRequestType<
  (typeof apiClient)["workspaces"][":workspaceSlug"]["image-gen"]["generate"]["$post"]
>["json"];

export type ProductImageGenerateResponse = InferResponseType<
  (typeof apiClient)["workspaces"][":workspaceSlug"]["image-gen"]["generate"]["$post"]
>;

export const invalidateProductListQueries = async (queryClient: QueryClient) =>
  queryClient.invalidateQueries({
    predicate: (query) =>
      Array.isArray(query.queryKey) && query.queryKey[0] === "product-list",
    type: "all",
  });

export const prefetchProductList = async (
  queryClient: QueryClient,
  workspaceSlug: string,
  params: ProductListParams = {},
) => {
  return queryClient.prefetchQuery({
    queryKey: ["product-list", params],
    queryFn: () =>
      apiClient.workspaces[":workspaceSlug"].products
        .$get({
          query: params,
          param: { workspaceSlug },
        })
        .then((res) => res.json()),
  });
};

export const useProductListQuery = (params: ProductListParams = {}) => {
  const { workspace } = useWorkspace();

  return useHonoQuery({
    queryKey: ["product-list", params],
    queryFn: (api) =>
      api.workspaces[":workspaceSlug"].products.$get({
        query: params,
        param: { workspaceSlug: workspace.slug },
      }),
  });
};

export const useProductQuery = (productId: string | undefined) => {
  const { workspace } = useWorkspace();

  return useHonoQuery({
    queryKey: ["product", productId],
    queryFn: (api) =>
      api.workspaces[":workspaceSlug"].products[":id"].$get({
        param: {
          workspaceSlug: workspace.slug,
          // biome-ignore lint/style/noNonNullAssertion: guarded by enabled
          id: productId!,
        },
      }),
    enabled: !!productId,
  });
};

export const useProductCreateMutation = (onSuccess?: () => void) => {
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();

  return useHonoMutation({
    mutationFn: (api, data: ProductCreateInput) =>
      api.workspaces[":workspaceSlug"].products.$post({
        param: { workspaceSlug: workspace.slug },
        json: data,
      }),
    onSuccess: async () => {
      await invalidateProductListQueries(queryClient);
      toast.success("Product created");
      onSuccess?.();
    },
  });
};

export const useProductUpdateMutation = (onSuccess?: () => void) => {
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();

  return useHonoMutation({
    mutationFn: (api, { id, data }: { id: string; data: ProductUpdateInput }) =>
      api.workspaces[":workspaceSlug"].products[":id"].$patch({
        param: { workspaceSlug: workspace.slug, id },
        json: data,
      }),
    onSuccess: async (_data, { id }) => {
      await invalidateProductListQueries(queryClient);
      await queryClient.invalidateQueries({
        queryKey: ["product", id],
      });
      toast.success("Product updated");
      onSuccess?.();
    },
  });
};

export const useProductDeleteMutation = (onSuccess?: () => void) => {
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();

  return useHonoMutation({
    mutationFn: (api, productId: string) =>
      api.workspaces[":workspaceSlug"].products[":id"].$delete({
        param: { workspaceSlug: workspace.slug, id: productId },
      }),
    onSuccess: async () => {
      await invalidateProductListQueries(queryClient);
      toast.success("Product deleted");
      onSuccess?.();
    },
  });
};

export const useProductImageGenerateMutation = (
  onSuccess?: (
    data: ProductImageGenerateResponse,
    variables: ProductImageGenerateInput,
  ) => void,
) => {
  const { workspace } = useWorkspace();

  return useHonoMutation<
    ProductImageGenerateResponse,
    ProductImageGenerateInput
  >({
    mutationFn: (api, variables) =>
      api.workspaces[":workspaceSlug"]["image-gen"].generate.$post({
        param: { workspaceSlug: workspace.slug },
        json: variables,
      }),
    onSuccess: (data, variables, _context) => {
      const count = variables.batchCount || 1;

      // Check if response is async (production) or sync (local)
      const isAsync = "async" in data && data.async === true;

      if (isAsync) {
        // Async mode - generation started, will get updates via WebSocket
        toast.success(
          count === 1
            ? "Image generation started"
            : `${count} image generations started`,
        );
      } else {
        // Sync mode - generation completed immediately
        toast.success(
          count === 1
            ? "Image generated successfully"
            : `${count} images generated successfully`,
        );
      }

      onSuccess?.(data, variables);
    },
  });
};
