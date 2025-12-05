import type { ProductSelectType } from "@core/schemas/product.sql";
import { Badge } from "@openpromo/ui/components/badge";
import type { ColumnDef } from "@tanstack/react-table";

export const tagsColumn: ColumnDef<ProductSelectType> = {
  accessorKey: "tags",
  header: "Tags",
  size: 120,
  cell: ({ row }) => {
    const tags = row.original.tags || [];

    if (tags.length === 0) {
      return <span className="text-sm text-muted-foreground">—</span>;
    }

    return (
      <div className="flex flex-wrap gap-1">
        {tags.slice(0, 3).map((tag) => (
          <Badge key={tag} variant="secondary" className="text-xs">
            {tag}
          </Badge>
        ))}
        {tags.length > 3 && (
          <Badge variant="outline" className="text-xs">
            +{tags.length - 3}
          </Badge>
        )}
      </div>
    );
  },
};
