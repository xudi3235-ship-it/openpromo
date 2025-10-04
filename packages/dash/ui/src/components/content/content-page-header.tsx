import { Button } from "@openpromo/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@openpromo/ui/components/dropdown-menu";
import { Input } from "@openpromo/ui/components/input";
import type { Table } from "@tanstack/react-table";
import type { MergedContentEntity } from "@worker/routes/api/workspaces/content";
import { ChevronDown, Plus } from "lucide-react";
import { useDialogComposerStore } from "@/stores/dialog-composer-store";

interface ContentPageHeaderProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  table: Table<MergedContentEntity>;
}

export function ContentPageHeader({
  searchValue,
  onSearchChange,
  table,
}: ContentPageHeaderProps) {
  const openDialog = useDialogComposerStore((state) => state.openDialog);

  return (
    <>
      {/* Title Section */}
      <div className="flex flex-wrap items-start gap-4">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">Content</h1>
          <p className="text-sm text-muted-foreground">
            Plan, publish, and measure everything in one place.
          </p>
        </div>
        <div className="flex gap-2 ml-auto">
          <Button onClick={() => openDialog()}>
            <Plus className="h-4 w-4" />
            Create Post
          </Button>
        </div>
      </div>

      {/* Search and Columns Section */}
      <div className="flex flex-wrap items-center gap-3 md:gap-4 py-2">
        <Input
          placeholder="Search content..."
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          className="max-w-sm"
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              Columns <ChevronDown />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => {
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) =>
                      column.toggleVisibility(!!value)
                    }
                  >
                    {column.id}
                  </DropdownMenuCheckboxItem>
                );
              })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );
}
