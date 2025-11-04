import { Button } from "@openpromo/ui/components/button";
import { ListState } from "@openpromo/ui/components/list-state";
import { Package, Plus } from "lucide-react";

interface ProductsEmptyStateProps {
  hasFilters: boolean;
  onAddProduct?: () => void;
}

export function ProductsEmptyState({
  hasFilters,
  onAddProduct,
}: ProductsEmptyStateProps) {
  if (hasFilters) {
    return (
      <ListState
        size="sm"
        className="mx-auto max-w-sm"
        icon={<Package className="h-10 w-10" />}
        title="No products found"
        description="Try adjusting your search or filters."
      />
    );
  }

  return (
    <ListState
      size="md"
      className="mx-auto max-w-md"
      icon={<Package className="h-12 w-12" />}
      title="No products yet"
      description="Add products to your catalog to use them in content generation. Upload images, connect e-commerce platforms, or add custom links."
    >
      <Button className="mt-4" onClick={onAddProduct}>
        <Plus className="mr-2 h-4 w-4" />
        Add Your First Product
      </Button>
    </ListState>
  );
}
