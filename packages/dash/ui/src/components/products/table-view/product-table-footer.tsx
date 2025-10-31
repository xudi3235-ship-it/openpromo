import type { ProductSelectType } from "@core/schemas/product.sql";
import { Button } from "@openpromo/ui/components/button";
import type { Table } from "@tanstack/react-table";

interface ProductTableFooterProps {
  table: Table<ProductSelectType>;
  totalCount?: number;
}

export function ProductTableFooter({
  table,
  totalCount,
}: ProductTableFooterProps) {
  const pageIndex = table.getState().pagination.pageIndex;
  const pageSize = table.getState().pagination.pageSize;
  const totalPages = table.getPageCount();
  const selectedCount = table.getFilteredSelectedRowModel().rows.length;
  const totalRows = table.getFilteredRowModel().rows.length;

  const startRow = pageIndex * pageSize + 1;
  const endRow = Math.min((pageIndex + 1) * pageSize, totalRows);

  return (
    <div className="flex items-center justify-between space-x-2 py-4">
      {/* Left side - Selection info */}
      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
        <div>
          {selectedCount} of {totalRows} row(s) selected.
        </div>
        {totalCount !== undefined && (
          <div>
            Showing {startRow} to {endRow} of {totalCount} total products
          </div>
        )}
      </div>

      {/* Right side - Pagination controls */}
      <div className="flex items-center space-x-2">
        {/* Rows per page selector */}
        <div className="flex items-center space-x-2">
          <p className="text-sm font-medium">Rows per page</p>
          <select
            value={pageSize}
            onChange={(e) => {
              table.setPageSize(Number(e.target.value));
            }}
            className="h-8 w-[70px] rounded border border-input bg-background px-2 text-sm"
          >
            {[10, 20, 30, 40, 50].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>

        {/* Page indicator */}
        <div className="flex w-[100px] items-center justify-center text-sm font-medium">
          Page {pageIndex + 1} of {totalPages || 1}
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            {"<<"}
          </Button>
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            {"<"}
          </Button>
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            {">"}
          </Button>
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => table.setPageIndex(totalPages - 1)}
            disabled={!table.getCanNextPage()}
          >
            {">>"}
          </Button>
        </div>
      </div>
    </div>
  );
}
