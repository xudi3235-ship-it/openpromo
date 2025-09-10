import type { ColumnDef } from "@tanstack/react-table";
import type { MergedContentEntity } from "@worker/routes/api/workspaces/content";
import { matchEntity } from "@worker/routes/api/workspaces/content";

export const placementColumn: ColumnDef<MergedContentEntity> = {
  accessorKey: "Placement",
  header: () => <div className="text-right">Placement</div>,
  cell: ({ row }) => {
    const ent = row.original;
    return matchEntity(ent, {
      content: (entity) => (
        <div className="text-right">{entity.entity.placement}</div>
      ),
      group: () => <div className="text-right">{"TODO"}</div>,
    });
  },
};
