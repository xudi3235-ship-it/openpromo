import { Button } from "@openpromo/ui/components/button";
import type { ColumnDef } from "@tanstack/react-table";
import type { MergedContentEntity } from "@worker/routes/api/workspaces/content";
import {
  format,
  formatDistanceToNow,
  isThisWeek,
  isToday,
  isYesterday,
} from "date-fns";
import { ArrowUpDown } from "lucide-react";
import { ColumnHeaderWithTooltip } from "./column-header-with-tooltip";

function formatCreatedAt(date: Date): { primary: string; secondary: string } {
  if (isToday(date)) {
    return {
      primary: formatDistanceToNow(date, { addSuffix: true }),
      secondary: format(date, "h:mm a"),
    };
  }

  if (isYesterday(date)) {
    return {
      primary: "Yesterday",
      secondary: format(date, "h:mm a"),
    };
  }

  if (isThisWeek(date)) {
    return {
      primary: format(date, "EEEE"),
      secondary: format(date, "h:mm a"),
    };
  }

  // Older dates
  return {
    primary: format(date, "MMM d"),
    secondary: format(date, "yyyy"),
  };
}

export const createdAtColumn: ColumnDef<MergedContentEntity> = {
  id: "createdAt",
  accessorKey: "createdAt",
  enableSorting: true,
  header: ({ column }) => {
    return (
      <ColumnHeaderWithTooltip tooltip="When this content was created in the system">
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Created At
          <ArrowUpDown />
        </Button>
      </ColumnHeaderWithTooltip>
    );
  },
  cell: ({ row }) => {
    const createdAt = new Date(row.original.entity.createdAt);
    const { primary, secondary } = formatCreatedAt(createdAt);

    return (
      <div className="text-sm">
        <div className="font-medium text-gray-900 dark:text-gray-100">
          {primary}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {secondary}
        </div>
      </div>
    );
  },
};
