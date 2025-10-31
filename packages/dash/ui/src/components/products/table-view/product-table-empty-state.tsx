import { Button } from "@openpromo/ui/components/button";
import { Package } from "lucide-react";

interface ProductTableEmptyStateProps {
  hasFilters: boolean;
  onAddProduct: () => void;
}

export function ProductTableEmptyState({
  hasFilters,
  onAddProduct,
}: ProductTableEmptyStateProps) {
  if (hasFilters) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Package className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold">No products found</h3>
        <p className="text-sm text-muted-foreground mt-2">
          Try adjusting your search or filter criteria
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Package className="h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-semibold">No products yet</h3>
      <p className="text-sm text-muted-foreground mt-2 mb-4">
        Get started by adding your first product
      </p>
      <Button onClick={onAddProduct}>Add Product</Button>
    </div>
  );
}
