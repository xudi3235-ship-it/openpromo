import type { QueryClient } from "@tanstack/react-query";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useWorkspace } from "@/hooks/useWorkspace";
import { orpc } from "@/lib/orpc-client";
import type {
  ImageGenRouterInputs,
  ImageGenRouterOutputs,
} from "../../../worker/src/orpc/routes/image-gen";
import type {
  ProductRouterInputs,
  ProductRouterOutputs,
} from "../../../worker/src/orpc/routes/products";

export type ProductListParams = Omit<
  ProductRouterInputs["list"],
  "workspaceSlug"
>;
export type ProductListResponse = ProductRouterOutputs["list"];
export type ProductResponse = ProductRouterOutputs["get"];

export type ProductCreateInput = Omit<
  ProductRouterInputs["create"],
  "workspaceId" | "workspaceSlug"
>;

export type ProductUpdateInput = Omit<
  ProductRouterInputs["update"],
  "workspaceId" | "workspaceSlug"
>;

export type ProductImageGenerateInput = Omit<
  ImageGenRouterInputs["generate"],
  "workspaceId" | "workspaceSlug"
>;

export type ProductImageGenerateResponse = ImageGenRouterOutputs["generate"];

export const invalidateProductListQueries = async (
  queryClient: QueryClient,
) => {
  await queryClient.invalidateQueries({
    queryKey: orpc.products.list.key(),
  });
};

export const prefetchProductList = (
  queryClient: QueryClient,
  workspaceSlug: string,
  params: ProductListParams = {},
) => {
  // do not await
  queryClient.prefetchQuery(
    orpc.products.list.queryOptions({ input: { ...params, workspaceSlug } }),
  );
};

export const prefetchProductDetails = (
  queryClient: QueryClient,
  workspaceSlug: string,
  productId: string,
) => {
  // do not await
  queryClient.prefetchQuery(
    orpc.products.get.queryOptions({ input: { workspaceSlug, productId } }),
  );
};

export const useProductListQuery = (params: ProductListParams = {}) => {
  const { workspace } = useWorkspace();

  return useQuery(
    orpc.products.list.queryOptions({
      input: {
        ...params,
        workspaceSlug: workspace.slug,
      },
    }),
  );
};

export const useProductQuery = (productId: string | undefined) => {
  const { workspace } = useWorkspace();

  return useQuery(
    orpc.products.get.queryOptions({
      input: {
        workspaceSlug: workspace.slug,
        // biome-ignore lint/style/noNonNullAssertion: guarded by enabled
        productId: productId!,
      },
      enabled: Boolean(productId),
    }),
  );
};

export const useProductCreateMutation = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();
  const { workspace } = useWorkspace();

  return useMutation(
    orpc.products.create.mutationOptions({
      onSuccess: async () => {
        await invalidateProductListQueries(queryClient);
        toast.success("Product created");
        onSuccess?.();
      },
      mutationFn: async (input) => {
        return orpc.products.create.call({
          ...input,
          workspaceId: workspace.id,
        });
      },
    }),
  );
};

export const useProductUpdateMutation = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();
  const { workspace } = useWorkspace();

  return useMutation(
    orpc.products.update.mutationOptions({
      onSuccess: async (_data, variables) => {
        await invalidateProductListQueries(queryClient);
        await queryClient.invalidateQueries({
          queryKey: orpc.products.get.key({
            input: { productId: variables.productId },
          }),
        });
        toast.success("Product updated");
        onSuccess?.();
      },
      mutationFn: async (input) => {
        return orpc.products.update.call({
          ...input,
          workspaceId: workspace.id,
        });
      },
    }),
  );
};

export const useProductDeleteMutation = (onSuccess?: () => void) => {
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    ...orpc.products.delete.mutationOptions({
      onSuccess: async () => {
        await invalidateProductListQueries(queryClient);
        await queryClient.invalidateQueries({
          queryKey: orpc.products.list.key({
            input: { workspaceId: workspace.id },
          }),
        });
        toast.success("Product deleted");
        onSuccess?.();
      },
    }),
  });
};

export const useProductImageGenerateMutation = (
  onSuccess?: (
    data: ProductImageGenerateResponse,
    variables: ProductImageGenerateInput,
  ) => void,
) => {
  const { workspace } = useWorkspace();

  return useMutation<
    ProductImageGenerateResponse,
    Error,
    ProductImageGenerateInput
  >({
    mutationFn: async (variables) =>
      orpc.imageGen.generate.call({
        ...variables,
        workspaceSlug: workspace.slug,
      }),
    onSuccess: (data, variables) => {
      const count = variables.batchCount || 1;

      // Check if response is async (production) or sync (local)
      if (data.async) {
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
