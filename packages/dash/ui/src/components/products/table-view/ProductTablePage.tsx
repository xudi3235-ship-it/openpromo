import type { ProductSelectType } from "@core/schemas/product.sql";
import {
  type ColumnFiltersState,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
  type VisibilityState,
} from "@tanstack/react-table";
import { useEffect, useState } from "react";
import { useDebounceCallback } from "usehooks-ts";
import { useProductListQuery } from "@/queries/product";
import { CreateProductModal } from "../create-product-modal";
import { columns } from "./columns";
import { ProductTableBody } from "./product-table-body";
import { ProductTableFooter } from "./product-table-footer";
import { ProductTableLayout } from "./product-table-layout";

/**
 * ProductTablePage - Displays products in a table view with sorting and filtering
 * Alternative view to the card-based ProductListPage
 */
export function ProductTablePage() {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const [searchValue, setSearchValue] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const updateDebouncedSearch = useDebounceCallback((value: string) => {
    setDebouncedSearch(value.trim());
  }, 400);

  useEffect(() => {
    updateDebouncedSearch(searchValue);
    return () => {
      updateDebouncedSearch.cancel();
    };
  }, [searchValue, updateDebouncedSearch]);

  const { data, isLoading, error } = useProductListQuery({
    search: debouncedSearch || undefined,
  });

  const products = (data?.products ?? []) as unknown as ProductSelectType[];
  const hasFilters = Boolean(debouncedSearch);

  const table = useReactTable({
    data: products,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    // Client-side pagination for now
    manualPagination: false,
    manualSorting: false,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      pagination,
    },
  });

  if (error) {
    return (
      <ProductTableLayout
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        table={table}
        onAddProduct={() => setCreateModalOpen(true)}
      >
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
      </ProductTableLayout>
    );
  }

  return (
    <ProductTableLayout
      searchValue={searchValue}
      onSearchChange={setSearchValue}
      table={table}
      onAddProduct={() => setCreateModalOpen(true)}
    >
      <ProductTableBody
        table={table}
        isLoading={isLoading}
        hasFilters={hasFilters}
        onAddProduct={() => setCreateModalOpen(true)}
      />

      <ProductTableFooter table={table} totalCount={products.length} />

      <CreateProductModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
      />
    </ProductTableLayout>
  );
}
