import type { ProductSelectType } from "@core/schemas/product.sql";
import { ListState } from "@openpromo/ui/components/list-state";
import { useProductListQuery } from "@/queries/product";
import { AddProductCard } from "../add-product-card";
import { ProductCard } from "../product-card";
import { ProductsEmptyState } from "../products-empty-state";
import { ProductsLoadingState } from "../products-loading-state";

interface ProductGridViewProps {
  searchQuery: string;
  onAddProduct: () => void;
}

/**
 * ProductGridView - Grid/card view for products
 */
export function ProductGridView({
  searchQuery,
  onAddProduct,
}: ProductGridViewProps) {
  const { data, isLoading, error } = useProductListQuery({
    search: searchQuery || undefined,
  });

  const products = data?.products ?? [];

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <ListState
          size="sm"
          className="max-w-sm"
          title="Failed to load products."
          description={
            error instanceof Error ? error.message : "Please try again."
          }
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-1">
        <ProductsLoadingState />
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <ProductsEmptyState
          hasFilters={Boolean(searchQuery)}
          onAddProduct={onAddProduct}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-1">
      <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {/* Add Product Card */}
        <AddProductCard onAddProduct={onAddProduct} />

        {/* Product Cards */}
        {products.map((product) => (
          <ProductCard
            key={product.id}
            // TODO: bad idea, need to fix the types here
            product={product as unknown as ProductSelectType}
          />
        ))}
      </div>
    </div>
  );
}
