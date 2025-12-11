import { Button } from "@openpromo/ui/components/button";
import type { ColumnDef } from "@tanstack/react-table";
import type { MergedContentEntity } from "@worker/shared/content-types";
import { ArrowUpDown, Heart } from "lucide-react";
import { matchEntity } from "@/lib/hono-client";
import { ColumnHeaderWithTooltip } from "./column-header-with-tooltip";
import { formatNumber } from "./utils";

export const likesColumn: ColumnDef<MergedContentEntity> = {
  id: "likes",
  accessorFn: (row) => {
    if (row.type === "content") {
      return row.entity.metrics?.likes ?? 0;
    }
    return 0;
  },
  enableSorting: true,
  header: ({ column }) => (
    <ColumnHeaderWithTooltip
      tooltip="Total likes and reactions on published content"
      className="cursor-help"
    >
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Likes & Reactions
        <ArrowUpDown />
      </Button>
    </ColumnHeaderWithTooltip>
  ),
  cell: ({ row }) => {
    const entity = row.original;

    return matchEntity(entity, {
      content: (content) => {
        const likes = content.entity.metrics?.likes ?? 0;

        return (
          <div className="flex items-center space-x-1.5 text-sm text-gray-600 dark:text-gray-400">
            <Heart className="w-4 h-4" />
            <span>{likes > 0 ? formatNumber(likes) : "—"}</span>
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
