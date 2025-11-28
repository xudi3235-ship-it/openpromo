import { useQuery } from "@tanstack/react-query";
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
