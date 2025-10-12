import { createFileRoute } from "@tanstack/react-router";
import { ProductDetailPage } from "@/components/products/product-detail-page";

export const Route = createFileRoute(
  "/_authenticated/workspaces/$workspaceSlug/products/$productId",
)({
  component: ProductDetailPage,
});
