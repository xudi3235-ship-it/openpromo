import type { ColumnDef } from "@tanstack/react-table";
import type { MergedContentEntity } from "@worker/routes/api/workspaces/content";
import { Share2 } from "lucide-react";
import { matchEntity } from "@/lib/hono-client";
import { ColumnHeaderWithTooltip } from "./column-header-with-tooltip";
import { formatNumber } from "./utils";

export const sharesColumn: ColumnDef<MergedContentEntity> = {
  accessorKey: "shares",
  header: () => (
    <ColumnHeaderWithTooltip
      tooltip="Total shares and reposts of published content"
      className="cursor-help"
    >
      Shares
    </ColumnHeaderWithTooltip>
  ),
  cell: ({ row }) => {
    const entity = row.original;

    return matchEntity(entity, {
      content: () => {
        // TODO: replace with api
        const shares = 0;

        return (
          <div className="flex items-center space-x-1.5 text-sm text-gray-600 dark:text-gray-400">
            <Share2 className="w-4 h-4" />
            <span>{formatNumber(shares)}</span>
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
