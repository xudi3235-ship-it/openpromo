import { Button } from "@openpromo/ui/components/button";
import type { Table } from "@tanstack/react-table";
import type { MergedContentEntity } from "@worker/shared/content-types";

interface PaginationData {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

interface ContentPageFooterProps {
  table: Table<MergedContentEntity>;
  pagination?: PaginationData;
}

export function ContentPageFooter({
  table,
  pagination,
}: ContentPageFooterProps) {
  return (
    <div className="flex items-center justify-between space-x-2 py-4">
      {/* Left side - Selection info */}
      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
        <div>
          {table.getFilteredSelectedRowModel().rows.length} of{" "}
          {table.getFilteredRowModel().rows.length} row(s) selected.
        </div>
        {pagination && (
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
          <select
            value={table.getState().pagination.pageSize}
            onChange={(e) => {
              table.setPageSize(Number(e.target.value));
            }}
            className="h-8 w-[70px] rounded border border-input bg-background px-2 text-sm"
          >
            {[10, 20, 30, 40, 50].map((pageSize) => (
              <option key={pageSize} value={pageSize}>
                {pageSize}
              </option>
            ))}
          </select>
        </div>

        {/* Page indicator */}
        <div className="flex w-[100px] items-center justify-center text-sm font-medium">
          Page {pagination?.page ?? 1} of {pagination?.totalPages ?? 1}
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => table.setPageIndex(0)}
            disabled={!pagination?.hasPreviousPage}
          >
            {"<<"}
          </Button>
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => table.previousPage()}
            disabled={!pagination?.hasPreviousPage}
          >
            {"<"}
          </Button>
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => table.nextPage()}
            disabled={!pagination?.hasNextPage}
          >
            {">"}
          </Button>
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() =>
              table.setPageIndex((pagination?.totalPages ?? 1) - 1)
            }
            disabled={!pagination?.hasNextPage}
          >
            {">>"}
          </Button>
        </div>
      </div>
    </div>
  );
}
