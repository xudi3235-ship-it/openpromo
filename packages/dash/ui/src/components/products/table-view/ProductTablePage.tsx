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
import { useState } from "react";
import { useDebounceCallback } from "usehooks-ts";
import { useProductListQuery } from "@/queries/product";
import { useProductModalStore } from "@/stores/product-modal-store";
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
  const { openCreateModal } = useProductModalStore();

  // Debounced search query for API calls (local state only, not in URL)
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const updateDebouncedSearch = useDebounceCallback((value: string) => {
    setDebouncedSearch(value.trim());
  }, 400);

  const { data, isPending, error } = useProductListQuery({
    search: debouncedSearch || undefined,
  });

  const products = (data?.products ?? []) as unknown as ProductSelectType[];

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
        onAddProduct={() => openCreateModal()}
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
      onSearchChange={(value) => {
        setSearchValue(value);
        updateDebouncedSearch(value);
      }}
      table={table}
      onAddProduct={() => openCreateModal()}
    >
      <ProductTableBody
        table={table}
        isPending={isPending}
        hasFilters={Boolean(debouncedSearch)}
        onAddProduct={() => openCreateModal()}
      />

      <ProductTableFooter table={table} totalCount={products.length} />

      <CreateProductModal />
    </ProductTableLayout>
  );
}
