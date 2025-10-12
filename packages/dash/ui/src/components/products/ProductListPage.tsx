import type { ProductSelectType } from "@core/schemas/product.sql";
import { Button } from "@openpromo/ui/components/button";
import { Input } from "@openpromo/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@openpromo/ui/components/select";
import { Plus, Search } from "lucide-react";
import * as React from "react";
import { useDebounceCallback } from "usehooks-ts";
import { useProductListQuery } from "@/queries/product";
import { CreateProductModal } from "./create-product-modal";
import { ProductCard } from "./product-card";
import { ProductsEmptyState } from "./products-empty-state";
import { ProductsLoadingState } from "./products-loading-state";

/**
 * ProductListPage - Displays grid of products with search and filters
 * Route: /workspaces/:workspaceSlug/products
 */
export function ProductListPage() {
  const [searchValue, setSearchValue] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [source, setSource] = React.useState<string | undefined>();
  const [createModalOpen, setCreateModalOpen] = React.useState(false);

  const updateDebouncedSearch = useDebounceCallback((value: string) => {
    setDebouncedSearch(value.trim());
  }, 400);

  React.useEffect(() => {
    updateDebouncedSearch(searchValue);
    return () => {
      updateDebouncedSearch.cancel();
    };
  }, [searchValue, updateDebouncedSearch]);

  const { data, isLoading, error } = useProductListQuery({
    search: debouncedSearch || undefined,
    source,
  });

  const products = data?.products ?? [];
  const hasFilters = Boolean(debouncedSearch || source);

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

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Products</h1>
          <p className="text-sm text-muted-foreground">
            Manage your product catalog for content generation
          </p>
        </div>
        <Button onClick={() => setCreateModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Product
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={searchValue}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setSearchValue(e.target.value)
            }
            className="pl-9"
          />
        </div>
        <Select
          value={source ?? "__all__"}
          onValueChange={(value) =>
            setSource(value === "__all__" ? undefined : value)
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All sources" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All sources</SelectItem>
            <SelectItem value="MANUAL">Manual</SelectItem>
            <SelectItem value="AMAZON">Amazon</SelectItem>
            <SelectItem value="SHOPIFY">Shopify</SelectItem>
            <SelectItem value="ETSY">Etsy</SelectItem>
            <SelectItem value="CUSTOM_URL">Custom URL</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      {isLoading ? (
        <ProductsLoadingState />
      ) : products.length === 0 ? (
        <ProductsEmptyState
          hasFilters={hasFilters}
          onAddProduct={() => setCreateModalOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              // TODO: bad idea, need to fix the types here
              product={product as unknown as ProductSelectType}
            />
          ))}
        </div>
      )}

      <CreateProductModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
      />
    </div>
  );
}
