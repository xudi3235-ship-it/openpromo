import type { UnifiedContentSelect } from "@core/schemas/content.sql";
import type { ColumnDef, Row } from "@tanstack/react-table";
import type { MergedContentEntity } from "@worker/routes/api/workspaces/content";
import { matchEntity } from "@/lib/hono-client";

function renderTitle(row: Row<MergedContentEntity>) {
  const data = row.original;

  return matchEntity(data, {
    content: (entity) => {
      // biome-ignore lint/suspicious/noExplicitAny: later
      const { placementSpec }: UnifiedContentSelect = entity.entity as any;
      const src =
        placementSpec?.thumbnailUrl ?? "https://picsum.photos/200/300";
      return <img height={50} width={50} src={src} alt="some thumbnail" />;
    },
    group: () => null,
  });
}

export const titleColumn: ColumnDef<MergedContentEntity> = {
  accessorKey: "Title",
  header: "Title",
  cell: ({ row }) => {
    return renderTitle(row);
  },
};
