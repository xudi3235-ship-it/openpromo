import { Button } from "@openpromo/ui/components/button";
import type { ColumnDef } from "@tanstack/react-table";
import type { MergedContentEntity } from "@worker/shared/content-types";
import { ArrowUpDown, Eye } from "lucide-react";
import { matchEntity } from "@/lib/hono-client";
import { ColumnHeaderWithTooltip } from "./column-header-with-tooltip";
import { formatNumber } from "./utils";

export const reachColumn: ColumnDef<MergedContentEntity> = {
  id: "reach",
  accessorFn: (row) => {
    if (row.type === "content") {
      return row.entity.metrics?.reach ?? 0;
    }
    return 0;
  },
  enableSorting: true,
  header: ({ column }) => (
    <ColumnHeaderWithTooltip
      tooltip="Number of unique accounts reached"
      className="cursor-help"
    >
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Reach
        <ArrowUpDown />
      </Button>
    </ColumnHeaderWithTooltip>
  ),
  cell: ({ row }) => {
    const entity = row.original;

    return matchEntity(entity, {
      content: (content) => {
        const reach = content.entity.metrics?.reach ?? 0;

        return (
          <div className="flex items-center space-x-1.5 text-sm text-gray-600 dark:text-gray-400">
            <Eye className="w-4 h-4" />
            <span>{formatNumber(reach)}</span>
          </div>
        );
      },
      group: () => {
        return (
          <div className="flex items-center space-x-1 text-gray-400 dark:text-gray-500">
            <span className="text-xs">—</span>
          </div>
        );
      },
    });
  },
};
