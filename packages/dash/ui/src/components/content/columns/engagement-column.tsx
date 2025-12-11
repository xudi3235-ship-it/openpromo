import { Button } from "@openpromo/ui/components/button";
import type { ColumnDef } from "@tanstack/react-table";
import type { MergedContentEntity } from "@worker/shared/content-types";
import { ArrowUpDown, Zap } from "lucide-react";
import { matchEntity } from "@/lib/hono-client";
import { ColumnHeaderWithTooltip } from "./column-header-with-tooltip";
import { formatNumber } from "./utils";

export const engagementColumn: ColumnDef<MergedContentEntity> = {
  id: "engagement",
  accessorFn: (row) => {
    if (row.type === "content") {
      return row.entity.metrics?.engagement ?? 0;
    }
    return 0;
  },
  enableSorting: true,
  header: ({ column }) => (
    <ColumnHeaderWithTooltip
      tooltip="Total engagement (likes, comments, shares, etc.)"
      className="cursor-help"
    >
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Engagement
        <ArrowUpDown />
      </Button>
    </ColumnHeaderWithTooltip>
  ),
  cell: ({ row }) => {
    const entity = row.original;

    return matchEntity(entity, {
      content: (content) => {
        const engagement = content.entity.metrics?.engagement ?? 0;

        return (
          <div className="flex items-center space-x-1.5 text-sm text-gray-600 dark:text-gray-400">
            <Zap className="w-4 h-4" />
            <span>{engagement > 0 ? formatNumber(engagement) : "—"}</span>
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
