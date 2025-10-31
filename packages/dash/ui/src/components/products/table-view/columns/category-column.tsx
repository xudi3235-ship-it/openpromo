import type { ProductSelectType } from "@core/schemas/product.sql";
import type { ColumnDef } from "@tanstack/react-table";

export const categoryColumn: ColumnDef<ProductSelectType> = {
  accessorKey: "category",
  header: "Category",
  size: 120,
  cell: ({ row }) => {
    const category = row.original.category;
    return category ? (
      <span className="text-sm text-gray-900 dark:text-gray-100">
        {category}
      </span>
    ) : (
      <span className="text-sm text-muted-foreground">—</span>
    );
  },
};
