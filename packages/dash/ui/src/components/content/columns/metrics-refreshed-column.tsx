import type { ColumnDef } from "@tanstack/react-table";
import type { MergedContentEntity } from "@worker/shared/content-types";
import { formatDistanceToNow } from "date-fns";
import { RefreshCw } from "lucide-react";
import { matchEntity } from "@/lib/hono-client";
import { ColumnHeaderWithTooltip } from "./column-header-with-tooltip";

export const metricsRefreshedColumn: ColumnDef<MergedContentEntity> = {
  accessorKey: "metricsRefreshedAt",
  header: () => (
    <ColumnHeaderWithTooltip
      tooltip="When metrics were last updated"
      className="cursor-help"
    >
      Metrics Updated
    </ColumnHeaderWithTooltip>
  ),
  cell: ({ row }) => {
    const entity = row.original;

    return matchEntity(entity, {
      content: (content) => {
        const metricsRefreshedAt = content.entity.metricsRefreshedAt;

        if (!metricsRefreshedAt) {
          return (
            <div className="flex items-center space-x-1.5 text-sm text-gray-400 dark:text-gray-500">
              <RefreshCw className="w-4 h-4" />
              <span className="text-xs">Never</span>
            </div>
          );
        }

        return (
          <div className="flex items-center space-x-1.5 text-sm text-gray-600 dark:text-gray-400">
            <RefreshCw className="w-4 h-4" />
            <span className="text-xs">
              {formatDistanceToNow(new Date(metricsRefreshedAt), {
                addSuffix: true,
              })}
            </span>
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
