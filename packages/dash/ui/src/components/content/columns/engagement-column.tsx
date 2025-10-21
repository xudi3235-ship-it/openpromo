import type { ColumnDef } from "@tanstack/react-table";
import type { MergedContentEntity } from "@worker/routes/api/workspaces/content";
import { Zap } from "lucide-react";
import { matchEntity } from "@/lib/hono-client";
import { ColumnHeaderWithTooltip } from "./column-header-with-tooltip";
import { formatNumber } from "./utils";

export const engagementColumn: ColumnDef<MergedContentEntity> = {
  accessorKey: "engagement",
  header: () => (
    <ColumnHeaderWithTooltip
      tooltip="Total engagement (likes, comments, shares, etc.)"
      className="cursor-help"
    >
      Engagement
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
            <span>{formatNumber(engagement)}</span>
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
