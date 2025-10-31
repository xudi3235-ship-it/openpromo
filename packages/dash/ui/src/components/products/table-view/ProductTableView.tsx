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
import { useProductListQuery } from "@/queries/product";
import { useProductFilters } from "../use-product-filters";
import { columns } from "./columns";
import { ProductTableBody } from "./product-table-body";
import { ProductTableFooter } from "./product-table-footer";

interface ProductTableViewProps {
  onAddProduct: () => void;
}

/**
 * ProductTableView - Table view component for products (without header/search)
 */
export function ProductTableView({ onAddProduct }: ProductTableViewProps) {
  const { filters } = useProductFilters();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  const { data, isLoading, error } = useProductListQuery({
    search: filters.search || undefined,
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
    <>
      <ProductTableBody
        table={table}
        isLoading={isLoading}
        hasFilters={Boolean(filters.search)}
        onAddProduct={onAddProduct}
      />

      <ProductTableFooter table={table} totalCount={products.length} />
    </>
  );
}
