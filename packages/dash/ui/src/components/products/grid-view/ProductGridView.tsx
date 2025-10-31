import type { ProductSelectType } from "@core/schemas/product.sql";
import { useProductListQuery } from "@/queries/product";
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
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Failed to load products
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {error instanceof Error ? error.message : "Unknown error"}
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <ProductsLoadingState />;
  }

  if (products.length === 0) {
    return (
      <ProductsEmptyState
        hasFilters={Boolean(searchQuery)}
        onAddProduct={onAddProduct}
      />
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          // TODO: bad idea, need to fix the types here
          product={product as unknown as ProductSelectType}
        />
      ))}
    </div>
  );
}
