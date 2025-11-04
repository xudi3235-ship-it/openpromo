import { Button } from "@openpromo/ui/components/button";
import { Input } from "@openpromo/ui/components/input";
import { Page, PageContent, PageHeader } from "@openpromo/ui/components/page";
import { Stack } from "@openpromo/ui/components/stack";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@openpromo/ui/components/toggle-group";
import { Toolbar, ToolbarSection } from "@openpromo/ui/components/toolbar";
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
    <Page gap="md" className="h-full">
      <PageHeader>
        <Stack gap="xs">
          <h1 className="text-2xl font-semibold">Products</h1>
          <p className="text-sm text-muted-foreground">
            Manage your product catalog for content generation
          </p>
        </Stack>
        <Button onClick={() => setCreateModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Product
        </Button>
      </PageHeader>

      <Toolbar size="sm" justify="start" className="flex-wrap gap-y-2">
        <ToolbarSection>
          <div className="relative w-64 sm:w-72">
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
        </ToolbarSection>
        <ToolbarSection>
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
        </ToolbarSection>
      </Toolbar>

      <PageContent>
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
      </PageContent>

      <CreateProductModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
      />
    </Page>
  );
}
