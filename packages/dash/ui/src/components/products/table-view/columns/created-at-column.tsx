import type { ProductSelectType } from "@core/schemas/product.sql";
import type { ColumnDef } from "@tanstack/react-table";
import { formatDistanceToNow } from "date-fns";

export const createdAtColumn: ColumnDef<ProductSelectType> = {
  accessorKey: "createdAt",
  header: "Created",
  size: 120,
  cell: ({ row }) => {
    const createdAt = row.original.createdAt;
    if (!createdAt) {
      return <span className="text-sm text-muted-foreground">—</span>;
    }

    return (
      <span className="text-sm text-gray-900 dark:text-gray-100">
        {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
      </span>
    );
  },
};
