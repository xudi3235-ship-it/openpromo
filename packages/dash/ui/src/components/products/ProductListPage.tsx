import { Button } from "@openpromo/ui/components/button";
import { Input } from "@openpromo/ui/components/input";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@openpromo/ui/components/toggle-group";
import { LayoutGrid, Plus, Search, Table } from "lucide-react";
import type * as React from "react";
import { useState } from "react";
import { useDebounceCallback } from "usehooks-ts";
import { CreateProductModal } from "./create-product-modal";
import { ProductGridView } from "./grid-view/ProductGridView";
import { ProductTableView } from "./table-view/ProductTableView";
import { useProductFilters } from "./use-product-filters";

/**
 * ProductListPage - Main products page with view switching
 * Route: /workspaces/:workspaceSlug/products
 */
export function ProductListPage() {
  const { filters, setView } = useProductFilters();
  const [searchValue, setSearchValue] = useState("");
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // Debounced search query for API calls (local state only, not in URL)
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const updateDebouncedSearch = useDebounceCallback((value: string) => {
    setDebouncedSearch(value.trim());
  }, 400);

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
        <div className="relative w-80">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={searchValue}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setSearchValue(e.target.value);
              updateDebouncedSearch(e.target.value);
            }}
            className="pl-9"
          />
        </div>
        <ToggleGroup
          type="single"
          value={filters.view}
          onValueChange={(value) => {
            if (value) setView(value as "grid" | "table");
          }}
        >
          <ToggleGroupItem value="grid" aria-label="Grid view">
            <LayoutGrid className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="table" aria-label="Table view">
            <Table className="h-4 w-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Content */}
      {filters.view === "table" ? (
        <ProductTableView
          searchQuery={debouncedSearch}
          onAddProduct={() => setCreateModalOpen(true)}
        />
      ) : (
        <ProductGridView
          searchQuery={debouncedSearch}
          onAddProduct={() => setCreateModalOpen(true)}
        />
      )}

      <CreateProductModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
      />
    </div>
  );
}
