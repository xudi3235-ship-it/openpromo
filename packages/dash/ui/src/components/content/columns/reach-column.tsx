import type { ColumnDef } from "@tanstack/react-table";
import type { MergedContentEntity } from "@worker/routes/api/workspaces/content";
import { Eye } from "lucide-react";
import { matchEntity } from "@/lib/hono-client";

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}k`;
  }
  return num.toString();
}

export const reachColumn: ColumnDef<MergedContentEntity> = {
  accessorKey: "reach",
  header: "Reach",
  cell: ({ row }) => {
    const entity = row.original;

    return matchEntity(entity, {
      content: () => {
        const { impressions, reach } = {
          impressions: 0,
          reach: 0,
        };

        return (
          <div className="text-sm">
            <div className="flex items-center space-x-1 text-gray-900 dark:text-gray-100">
              <Eye className="w-4 h-4 text-purple-500" />
              <span className="font-medium">{formatNumber(reach)}</span>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {formatNumber(impressions)} impressions
            </div>
          </div>
        );
      },
      group: (entity) => {
        return (
          <div className="flex items-center justify-center py-2">
            <div className="text-center">
              <div className="text-sm text-gray-400 dark:text-gray-500 mb-1">
                No reach data
              </div>
              <div className="text-xs text-gray-400 dark:text-gray-500">
                {entity.contents.length} unpublished post
                {entity.contents.length !== 1 ? "s" : ""}
              </div>
            </div>
          </div>
        );
      },
    });
  },
};
