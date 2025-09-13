import type { UnifiedContentSelect } from "@core/schemas/content.sql";
import type { ColumnDef, Row } from "@tanstack/react-table";
import type { MergedContentEntity } from "@worker/routes/api/workspaces/content";
import { matchEntity } from "@/lib/hono-client";
import { getPlatformIcon } from "../utils/platform-icons";

function renderTitle(row: Row<MergedContentEntity>) {
  const data = row.original;

  return matchEntity(data, {
    content: (entity) => {
      const { placementSpec, placement }: UnifiedContentSelect =
        // biome-ignore lint/suspicious/noExplicitAny: later
        entity.entity as any;
      const src =
        placementSpec?.thumbnailUrl ?? "https://picsum.photos/200/300";
      const platformIcon = getPlatformIcon(placement);

      return (
        <div className="relative inline-block">
          <img
            height={60}
            width={60}
            src={src}
            alt="Content thumbnail"
            className="rounded-lg object-cover"
          />
          {platformIcon && (
            <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-sm border">
              {platformIcon}
            </div>
          )}
        </div>
      );
    },
    group: () => (
      <div className="flex items-center space-x-2">
        <div className="w-15 h-15 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Group
          </span>
        </div>
      </div>
    ),
  });
}

export const titleColumn: ColumnDef<MergedContentEntity> = {
  accessorKey: "Title",
  header: "Title",
  cell: ({ row }) => {
    return renderTitle(row);
  },
};
