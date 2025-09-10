import type { UnifiedContentSelect } from "@core/schemas/content.sql";
import { Button } from "@openpromo/ui/components/button";
import { Checkbox } from "@openpromo/ui/components/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@openpromo/ui/components/dropdown-menu";
import type { ColumnDef, Row } from "@tanstack/react-table";
import type { MergedContentEntity } from "@worker/routes/api/workspaces/content";
import { ArrowUpDown, MoreHorizontal } from "lucide-react";

function renderTitle(row: Row<MergedContentEntity>) {
  const data = row.original;

  if (data.type === "content") {
    // biome-ignore lint/suspicious/noExplicitAny: later
    const { placementSpec }: UnifiedContentSelect = data.entity as any;
    const src = placementSpec?.thumbnailUrl ?? "https://picsum.photos/200/300";
    return <img height={50} width={50} src={src} alt="some thumbnail" />;
  }

  return null;
}

export const columns: ColumnDef<MergedContentEntity>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "Title",
    header: "Title",
    cell: ({ row }) => {
      return renderTitle(row);
    },
  },
  {
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
  },
  {
    accessorKey: "Placement",
    header: () => <div className="text-right">Placement</div>,
    cell: ({ row }) => {
      const ent = row.original;
      if (ent.type === "content") {
        return <div className="text-right">{ent.entity.placement}</div>;
      }
      return <div className="text-right">{"TODO"}</div>;
    },
  },
  {
    accessorKey: "Status",
    header: () => <div className="text-right">Status</div>,
    cell: ({ row }) => {
      const status = row.original.entity.publishingStatus;
      return <div className="text-right">{status}</div>;
    },
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => {
      const payment = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(payment.entity.id)}
            >
              Copy payment ID
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>View customer</DropdownMenuItem>
            <DropdownMenuItem>View payment details</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
