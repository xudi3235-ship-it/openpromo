import { Button } from "@openpromo/ui/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@openpromo/ui/components/select";
import type { Table } from "@tanstack/react-table";

export interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface DataTableFooterProps<TData> {
  /** The TanStack table instance */
  table: Table<TData>;
  /** Optional server-side pagination info */
  pagination?: PaginationInfo;
  /** Show selection info */
  showSelection?: boolean;
  /** Show pagination info text */
  showPaginationInfo?: boolean;
  /** Available page size options */
  pageSizeOptions?: number[];
  /** Custom className */
  className?: string;
}

/**
 * DataTableFooter - Reusable table footer with pagination
 *
 * A standardized footer component for data tables with pagination controls,
 * page size selector, and selection info.
 *
 * @example
 * ```tsx
 * <DataTableFooter
 *   table={table}
 *   pagination={paginationInfo}
 *   showSelection
 * />
 * ```
 */
export function DataTableFooter<TData>({
  table,
  pagination,
  showSelection = true,
  showPaginationInfo = true,
  pageSizeOptions = [10, 20, 30, 40, 50],
  className = "",
}: DataTableFooterProps<TData>) {
  const selectedCount = table.getFilteredSelectedRowModel().rows.length;
  const totalRows = table.getFilteredRowModel().rows.length;
  const currentPage =
    pagination?.page ?? table.getState().pagination.pageIndex + 1;
  const totalPages = pagination?.totalPages ?? table.getPageCount();
  const hasPrevious = pagination?.hasPreviousPage ?? table.getCanPreviousPage();
  const hasNext = pagination?.hasNextPage ?? table.getCanNextPage();

  return (
    <div
      className={`flex items-center justify-between space-x-2 py-4 ${className}`}
    >
      {/* Left side - Selection info */}
      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
        {showSelection && (
          <div>
            {selectedCount} of {totalRows} row(s) selected
          </div>
        )}
        {showPaginationInfo && pagination && (
          <div>
            Showing {(pagination.page - 1) * pagination.pageSize + 1} to{" "}
            {Math.min(pagination.page * pagination.pageSize, pagination.total)}{" "}
            of {pagination.total} total entries
          </div>
        )}
      </div>

      {/* Right side - Pagination controls */}
      <div className="flex items-center space-x-2">
        {/* Rows per page selector */}
        <div className="flex items-center space-x-2">
          <p className="text-sm font-medium">Rows per page</p>
          <Select
            value={String(table.getState().pagination.pageSize)}
            onValueChange={(value) => {
              table.setPageSize(Number(value));
            }}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((pageSize) => (
                <SelectItem key={pageSize} value={String(pageSize)}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Page indicator */}
        <div className="flex w-[100px] items-center justify-center text-sm font-medium">
          Page {currentPage} of {totalPages}
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => table.setPageIndex(0)}
            disabled={!hasPrevious}
            title="First page"
          >
            {"<<"}
          </Button>
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => table.previousPage()}
            disabled={!hasPrevious}
            title="Previous page"
          >
            {"<"}
          </Button>
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => table.nextPage()}
            disabled={!hasNext}
            title="Next page"
          >
            {">"}
          </Button>
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => table.setPageIndex(totalPages - 1)}
            disabled={!hasNext}
            title="Last page"
          >
            {">>"}
          </Button>
        </div>
      </div>
    </div>
  );
}
