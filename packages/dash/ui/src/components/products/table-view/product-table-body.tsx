import type { ProductSelectType } from "@core/schemas/product.sql";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@openpromo/ui/components/table";
import { flexRender, type Table as TableType } from "@tanstack/react-table";
import { columns } from "./columns";
import { ProductTableEmptyState } from "./product-table-empty-state";
import { ProductTableSkeleton } from "./product-table-skeleton";

interface ProductTableBodyProps {
  table: TableType<ProductSelectType>;
  isLoading: boolean;
  hasFilters: boolean;
  onAddProduct: () => void;
}

export function ProductTableBody({
  table,
  isLoading,
  hasFilters,
  onAddProduct,
}: ProductTableBodyProps) {
  if (isLoading) {
    return <ProductTableSkeleton />;
  }

  return (
    <div className="overflow-hidden rounded-md border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                return (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && "selected"}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="p-0">
                <ProductTableEmptyState
                  hasFilters={hasFilters}
                  onAddProduct={onAddProduct}
                />
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
