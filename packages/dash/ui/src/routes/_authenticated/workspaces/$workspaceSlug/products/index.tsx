import { createFileRoute } from "@tanstack/react-router";
import { ProductsPage } from "@/components/products/page";

export const Route = createFileRoute(
  "/_authenticated/workspaces/$workspaceSlug/products/",
)({
  component: ProductsPage,
});
