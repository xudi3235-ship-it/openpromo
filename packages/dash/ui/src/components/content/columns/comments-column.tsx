import type { ColumnDef } from "@tanstack/react-table";
import type { MergedContentEntity } from "@worker/routes/api/workspaces/content";
import { MessageCircle } from "lucide-react";
import { matchEntity } from "@/lib/hono-client";
import { ColumnHeaderWithTooltip } from "./column-header-with-tooltip";
import { formatNumber } from "./utils";

export const commentsColumn: ColumnDef<MergedContentEntity> = {
  accessorKey: "comments",
  header: () => (
    <ColumnHeaderWithTooltip
      tooltip="Total comments on published content"
      className="cursor-help"
    >
      Comments
    </ColumnHeaderWithTooltip>
  ),
  cell: ({ row }) => {
    const entity = row.original;

    return matchEntity(entity, {
      content: () => {
        // TODO: replace with api
        const comments = 0;

        return (
          <div className="flex items-center space-x-1.5 text-sm text-gray-600 dark:text-gray-400">
            <MessageCircle className="w-4 h-4" />
            <span>{formatNumber(comments)}</span>
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
