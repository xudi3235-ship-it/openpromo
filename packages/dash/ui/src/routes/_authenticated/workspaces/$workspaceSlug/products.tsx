import { createFileRoute } from "@tanstack/react-router";
import { ProductsPage } from "@/components/products/page";

export const Route = createFileRoute(
  "/_authenticated/workspaces/$workspaceSlug/products",
)({
  component: function WorkspaceProductsRoute() {
    return (
      <div className="h-full p-4">
        <ProductsPage />
      </div>
    );
  },
});
