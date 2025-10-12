import { createFileRoute } from "@tanstack/react-router";
import { ProductListPage } from "@/components/products/ProductListPage";

export const Route = createFileRoute(
  "/_authenticated/workspaces/$workspaceSlug/products/",
)({
  component: ProductListPage,
});
