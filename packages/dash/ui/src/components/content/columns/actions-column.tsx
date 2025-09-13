import { Button } from "@openpromo/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@openpromo/ui/components/dropdown-menu";
import type { ColumnDef } from "@tanstack/react-table";
import type { MergedContentEntity } from "@worker/routes/api/workspaces/content";
import { MoreHorizontal } from "lucide-react";
import { matchEntity } from "@/lib/hono-client";

export const actionsColumn: ColumnDef<MergedContentEntity> = {
  id: "actions",
  enableHiding: false,
  cell: ({ row }) => {
    const entity = row.original;

    return (
      <div className="flex items-center gap-2">
        <Button size="sm" variant={"outline"} onClick={() => {}}>
          Open
        </Button>
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
              onClick={() => navigator.clipboard.writeText(entity.entity.id)}
            >
              {matchEntity(entity, {
                content: () => "Copy content ID",
                group: () => "Copy group ID",
              })}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {matchEntity(entity, {
              content: () => (
                <>
                  <DropdownMenuItem>View content</DropdownMenuItem>
                  <DropdownMenuItem>Edit content</DropdownMenuItem>
                </>
              ),
              group: () => (
                <>
                  <DropdownMenuItem>View group</DropdownMenuItem>
                  <DropdownMenuItem>Edit group</DropdownMenuItem>
                </>
              ),
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  },
};
