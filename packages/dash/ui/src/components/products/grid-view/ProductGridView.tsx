import type { ProductSelectType } from "@core/schemas/product.sql";
import { ListState } from "@openpromo/ui/components/list-state";
import { ImageGrid } from "@/components/common/ImageGrid";
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
  const { data, isPending, error } = useProductListQuery({
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

  if (isPending) {
    return (
      <div className="flex flex-1">
        <ProductsLoadingState />
      </div>
    );
  }

  const containerClass =
    "flex flex-1 min-w-0 items-stretch justify-center overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-800";

  if (products.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className={containerClass}>
          <div className="flex flex-1 items-center justify-center p-6">
            <ProductsEmptyState
              hasFilters={Boolean(searchQuery)}
              onAddProduct={onAddProduct}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1">
      <div className={containerClass}>
        <ImageGrid
          tight
          cols={{ sm: 2, md: 3, lg: 4, xl: 5 }}
          className="w-full content-start"
        >
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
        </ImageGrid>
      </div>
    </div>
  );
}
