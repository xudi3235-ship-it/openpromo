import type { ColumnDef } from "@tanstack/react-table";
import type { MergedContentEntity } from "@worker/shared/content-types";
import { formatDistanceToNow } from "date-fns";
import { matchEntity } from "@/lib/hono-client";
import { MetricsFreshnessBadge } from "../metrics-freshness-badge";
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

        return (
          <div className="flex items-center space-x-2">
            <MetricsFreshnessBadge lastRefreshedAt={metricsRefreshedAt} />
            {metricsRefreshedAt && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {formatDistanceToNow(new Date(metricsRefreshedAt), {
                  addSuffix: true,
                })}
              </span>
            )}
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
