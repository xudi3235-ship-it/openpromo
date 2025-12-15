import { Button } from "@openpromo/ui/components/button";
import type { ColumnDef } from "@tanstack/react-table";
import type { MergedContentEntity } from "@worker/shared/content-types";
import { ArrowUpDown, MessageCircle } from "lucide-react";
import { matchEntity } from "@/lib/hono-client";
import { ColumnHeaderWithTooltip } from "./column-header-with-tooltip";
import { formatNumber } from "./utils";

export const commentsColumn: ColumnDef<MergedContentEntity> = {
  id: "comments",
  accessorFn: (row) => {
    if (row.type === "content") {
      return row.entity.metrics?.comments ?? 0;
    }
    return 0;
  },
  enableSorting: true,
  header: ({ column }) => (
    <ColumnHeaderWithTooltip
      tooltip="Total comments on published content"
      className="cursor-help"
    >
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Comments
        <ArrowUpDown />
      </Button>
    </ColumnHeaderWithTooltip>
  ),
  cell: ({ row }) => {
    const entity = row.original;

    return matchEntity(entity, {
      content: (content) => {
        const comments = content.entity.metrics?.comments ?? 0;

        return (
          <div className="flex items-center space-x-1.5 text-sm text-gray-600 dark:text-gray-400">
            <MessageCircle className="w-4 h-4" />
            <span>{comments > 0 ? formatNumber(comments) : "—"}</span>
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
