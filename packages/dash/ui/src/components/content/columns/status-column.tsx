import type { ColumnDef } from "@tanstack/react-table";
import type { MergedContentEntity } from "@worker/routes/api/workspaces/content";
import { matchEntity } from "@worker/routes/api/workspaces/content";

export const statusColumn: ColumnDef<MergedContentEntity> = {
  accessorKey: "Status",
  header: () => <div className="text-right">Status</div>,
  cell: ({ row }) => {
    return matchEntity(row.original, {
      content: (entity) => (
        <div className="text-right">{entity.entity.publishingStatus}</div>
      ),
      group: (entity) => (
        <div className="text-right">{entity.entity.publishingStatus}</div>
      ),
    });
  },
};
