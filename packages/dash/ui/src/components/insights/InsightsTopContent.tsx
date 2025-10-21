import { Button } from "@openpromo/ui/components/button";
import { Skeleton } from "@openpromo/ui/components/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@openpromo/ui/components/table";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import type { MergedContentEntity } from "@worker/routes/api/workspaces/content";
import { ExternalLink } from "lucide-react";
import { useMemo, useState } from "react";
import { matchEntity } from "@/lib/hono-client";
import { ColumnHeaderWithTooltip } from "../content/columns/column-header-with-tooltip";
import { commentsColumn } from "../content/columns/comments-column";
import { engagementColumn } from "../content/columns/engagement-column";
import { impressionsColumn } from "../content/columns/impressions-column";
import { likesColumn } from "../content/columns/likes-column";
import { sharesColumn } from "../content/columns/shares-column";
import { statusColumn } from "../content/columns/status-column";
import { titleColumn } from "../content/columns/title-column";
import { formatNumber } from "../content/columns/utils";

type InsightsTopContentProps = {
  items: MergedContentEntity[];
};

const rankColumn: ColumnDef<MergedContentEntity> = {
  id: "rank",
  enableSorting: false,
  enableHiding: false,
  size: 60,
  header: () => (
    <div className="text-center text-muted-foreground text-xs font-medium">
      #
    </div>
  ),
  cell: ({ row }) => (
    <div className="text-center text-sm font-semibold text-muted-foreground">
      #{row.index + 1}
    </div>
  ),
};
const clicksColumn: ColumnDef<MergedContentEntity> = {
  id: "clicks",
  accessorFn: (row) =>
    row.type === "content" ? (row.entity.metrics?.clicks ?? 0) : 0,
  header: ({ column }) => (
    <ColumnHeaderWithTooltip tooltip="Total link clicks recorded">
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Clicks
        <span className="sr-only">Click to sort</span>
      </Button>
    </ColumnHeaderWithTooltip>
  ),
  cell: ({ row }) =>
    matchEntity(row.original, {
      content: (entity) => (
        <div className="text-right text-sm text-muted-foreground">
          {formatNumber(entity.entity.metrics?.clicks ?? 0)}
        </div>
      ),
      group: () => (
        <div className="text-right text-xs text-muted-foreground">—</div>
      ),
    }),
};

const viewColumn: ColumnDef<MergedContentEntity> = {
  id: "view",
  enableSorting: false,
  enableHiding: false,
  size: 60,
  header: () => <div className="sr-only">View</div>,
  cell: ({ row }) =>
    matchEntity(row.original, {
      content: (entity) => {
        const url = entity.entity.permalinkUrl;
        if (!url) return null;
        return (
          <div className="flex justify-end">
            <Button variant="ghost" size="icon" asChild>
              <a href={url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          </div>
        );
      },
      group: () => null,
    }),
};

const topContentColumns: ColumnDef<MergedContentEntity>[] = [
  rankColumn,
  titleColumn,
  statusColumn,
  impressionsColumn,
  engagementColumn,
  likesColumn,
  commentsColumn,
  sharesColumn,
  clicksColumn,
  viewColumn,
];

export function InsightsTopContent({ items }: InsightsTopContentProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "impressions", desc: true },
  ]);

  const data = useMemo(() => items ?? [], [items]);

  const table = useReactTable({
    data,
    columns: topContentColumns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualSorting: false,
  });

  if (!items || items.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        No content data available yet. Publish or backfill posts to see
        performance.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-md border border-border/40">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id} className="whitespace-nowrap">
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length > 0 ? (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id} className="hover:bg-accent/40">
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="align-middle">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={topContentColumns.length} className="h-24">
                <div className="flex justify-center text-sm text-muted-foreground">
                  No results
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export function InsightsTopContentSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-md border border-border/40">
      <Table>
        <TableHeader>
          <TableRow>
            {Array.from({ length: topContentColumns.length }).map(
              (_, index) => (
                <TableHead
                  // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton structure
                  key={index}
                  className="whitespace-nowrap"
                >
                  <Skeleton className="h-4 w-20 rounded" />
                </TableHead>
              ),
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rows }).map((_, index) => (
            <TableRow
              // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton rows
              key={index}
            >
              {Array.from({ length: topContentColumns.length }).map(
                (_, cellIndex) => (
                  <TableCell
                    // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton cells
                    key={cellIndex}
                    className="align-middle"
                  >
                    <Skeleton className="h-4 w-full rounded" />
                  </TableCell>
                ),
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
