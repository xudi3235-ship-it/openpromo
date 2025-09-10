import { Button } from "@openpromo/ui/components/button";
import type { ColumnDef } from "@tanstack/react-table";
import type { MergedContentEntity } from "@worker/routes/api/workspaces/content";
import { ArrowUpDown } from "lucide-react";

export const createdAtColumn: ColumnDef<MergedContentEntity> = {
  accessorKey: "Created At",
  header: ({ column }) => {
    return (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Created At
        <ArrowUpDown />
      </Button>
    );
  },
  cell: ({ row }) => (
    <div className="lowercase">
      {new Date(row.original.entity.createdAt).toDateString()}
    </div>
  ),
};
