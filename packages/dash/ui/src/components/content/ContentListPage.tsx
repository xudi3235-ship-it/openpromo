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
import { useContentListQuery } from "@/queries/content-orpc";
import { BatchActionsToolbar } from "./batch-actions-toolbar";
import { columns } from "./columns";
import { ContentErrorState } from "./content-error-state";
import type { ContentFilters as ContentFiltersType } from "./content-filters";
import { ContentPageBody } from "./content-page-body";
import { ContentPageFooter } from "./content-page-footer";
import { ContentPageLayout } from "./content-page-layout";
import { SortingIndicator } from "./sorting-indicator";
import { useContentListQueryParams } from "./use-content-list-query-params";

/**
 * ContentListPage - Displays paginated list of content with filters
 * Route: /workspaces/:workspaceSlug/content
 */
export function ContentListPage() {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const [filters, setFilters] = useState<ContentFiltersType>({});
  const [searchValue, setSearchValue] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const updateDebouncedSearch = useDebounceCallback((value: string) => {
    setDebouncedSearch(value.trim());
  }, 400);
  const normalizedSearch = debouncedSearch;

  const queryParams = useContentListQueryParams(
    sorting,
    pagination,
    filters,
    normalizedSearch,
  );

  const { data, isPending, error, refetch } = useContentListQuery(queryParams);
  const table = useReactTable({
    data: data?.entities ?? [],
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    // Server-side pagination and sorting
    manualPagination: true,
    manualSorting: true,
    pageCount: data?.pagination?.totalPages ?? 0,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      pagination,
    },
  });

  useEffect(() => {
    updateDebouncedSearch(searchValue);
    return () => {
      updateDebouncedSearch.cancel();
    };
  }, [searchValue, updateDebouncedSearch]);

  useEffect(() => {
    setPagination((prev) =>
      prev.pageIndex === 0 ? prev : { ...prev, pageIndex: 0 },
    );
  }, []);

  const selectedRows = table
    .getFilteredSelectedRowModel()
    .rows.map((row) => row.original);

  const handleRetry = () => {
    refetch();
  };

  if (error) {
    return (
      <ContentPageLayout
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        table={table}
        filters={filters}
        onFiltersChange={setFilters}
      >
        <ContentErrorState error={error as Error} onRetry={handleRetry} />
      </ContentPageLayout>
    );
  }

  return (
    <ContentPageLayout
      searchValue={searchValue}
      onSearchChange={setSearchValue}
      table={table}
      filters={filters}
      onFiltersChange={setFilters}
    >
      <BatchActionsToolbar
        selectedRows={selectedRows}
        onClearSelection={() => table.toggleAllPageRowsSelected(false)}
      />

      <SortingIndicator
        sorting={sorting}
        onClearSorting={() => setSorting([])}
      />

      <ContentPageBody table={table} isLoading={isPending} />

      <ContentPageFooter table={table} pagination={data?.pagination} />
    </ContentPageLayout>
  );
}
