import { Button } from "@openpromo/ui/components/button";
import { Package, Plus } from "lucide-react";

interface ProductsEmptyStateProps {
  hasFilters: boolean;
}

export function ProductsEmptyState({ hasFilters }: ProductsEmptyStateProps) {
  if (hasFilters) {
    return (
      <div className="flex h-full items-center justify-center py-12">
        <div className="text-center">
          <Package className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">No products found</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Try adjusting your search or filters
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full items-center justify-center py-12">
      <div className="text-center max-w-md">
        <Package className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold">No products yet</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Add products to your catalog to use them in content generation. Upload
          images, connect to platforms like Amazon or Shopify, or add custom
          product links.
        </p>
        <Button className="mt-6">
          <Plus className="h-4 w-4 mr-2" />
          Add Your First Product
        </Button>
      </div>
    </div>
  );
}
