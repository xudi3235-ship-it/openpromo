import { Button } from "@openpromo/ui/components/button";
import { Input } from "@openpromo/ui/components/input";
import { Page, PageContent, PageHeader } from "@openpromo/ui/components/page";
import { Stack } from "@openpromo/ui/components/stack";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@openpromo/ui/components/toggle-group";
import { Toolbar, ToolbarSection } from "@openpromo/ui/components/toolbar";
import { LayoutGrid, Plus, Search, Sparkles, Table } from "lucide-react";
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
          <p className="text-sm text-muted-foreground max-w-2xl">
            Import and organize the products you sell so they can power image
            generation, post creation, and any workflow that needs accurate
            product data.
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

      <PageContent gap="lg">
        <div className="rounded-xl border border-border/70 bg-muted/10 p-4">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-4 w-4 text-muted-foreground" />
            <div className="space-y-1 text-sm">
              <p className="font-medium text-foreground">
                Keep your catalog campaign-ready
              </p>
              <p className="text-muted-foreground">
                Products you add or update here stay available inside Composer,
                the Image Generator, and upcoming posting flows so every channel
                shares the same source of truth.
              </p>
            </div>
          </div>
        </div>

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
