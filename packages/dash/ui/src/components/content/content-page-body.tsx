import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@openpromo/ui/components/table";
import { flexRender, type Table as TableType } from "@tanstack/react-table";
import type { MergedContentEntity } from "@worker/shared/content-types";
import type { KeyboardEvent, MouseEvent } from "react";
import { TableSkeleton } from "@/components/common";
import { columns } from "./columns";
import { ContentEmptyState } from "./content-empty-state";

interface ContentPageBodyProps {
  table: TableType<MergedContentEntity>;
  isLoading: boolean;
  onRowClick?: (entity: MergedContentEntity) => void;
}

export function ContentPageBody({
  table,
  isLoading,
  onRowClick,
}: ContentPageBodyProps) {
  if (isLoading) {
    return <TableSkeleton rows={6} columns={6} />;
  }

  return (
    <div className="min-h-0 flex-1 overflow-auto rounded-md border">
      <Table>
        <TableHeader className="sticky top-0 z-10">
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
            table.getRowModel().rows.map((row) => {
              const handleRowClick = (
                event: MouseEvent<HTMLTableRowElement>,
              ) => {
                if (!onRowClick) return;
                const target = event.target as HTMLElement | null;
                if (
                  target?.closest(
                    "button, a, input, textarea, select, [data-row-click-ignore]",
                  )
                ) {
                  return;
                }
                onRowClick(row.original);
              };

              const handleRowKeyDown = (
                event: KeyboardEvent<HTMLTableRowElement>,
              ) => {
                if (!onRowClick) return;
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onRowClick(row.original);
                }
              };

              return (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  onClick={onRowClick ? handleRowClick : undefined}
                  onKeyDown={onRowClick ? handleRowKeyDown : undefined}
                  tabIndex={onRowClick ? 0 : undefined}
                  className={
                    onRowClick
                      ? "cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary/60"
                      : undefined
                  }
                >
                  {row.getVisibleCells().map((cell) => {
                    const cellProps =
                      onRowClick &&
                      (cell.column.id === "actions" ||
                        cell.column.id === "select")
                        ? { "data-row-click-ignore": "true" as const }
                        : undefined;

                    return (
                      <TableCell key={cell.id} {...(cellProps ?? {})}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="p-0">
                <ContentEmptyState />
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
