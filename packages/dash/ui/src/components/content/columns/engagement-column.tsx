import type { ColumnDef } from "@tanstack/react-table";
import type { MergedContentEntity } from "@worker/routes/api/workspaces/content";
import { Heart, MessageCircle, Share } from "lucide-react";
import { matchEntity } from "@/lib/hono-client";

// Generate dummy engagement data
function generateEngagementData() {
  return {
    likes: Math.floor(Math.random() * 1000) + 10,
    comments: Math.floor(Math.random() * 100) + 1,
    shares: Math.floor(Math.random() * 50) + 1,
  };
}

function formatNumber(num: number): string {
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}k`;
  }
  return num.toString();
}

export const engagementColumn: ColumnDef<MergedContentEntity> = {
  accessorKey: "engagement",
  header: "Engagement",
  cell: ({ row }) => {
    const entity = row.original;

    return matchEntity(entity, {
      content: () => {
        const { likes, comments, shares } = generateEngagementData();

        return (
          <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center space-x-1">
              <Heart className="w-4 h-4 text-red-500" />
              <span>{formatNumber(likes)}</span>
            </div>
            <div className="flex items-center space-x-1">
              <MessageCircle className="w-4 h-4 text-blue-500" />
              <span>{formatNumber(comments)}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Share className="w-4 h-4 text-green-500" />
              <span>{formatNumber(shares)}</span>
            </div>
          </div>
        );
      },
      group: (entity) => {
        return (
          <div className="flex items-center justify-center py-2">
            <div className="text-center">
              <div className="text-sm text-gray-400 dark:text-gray-500 mb-1">
                No metrics yet
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
