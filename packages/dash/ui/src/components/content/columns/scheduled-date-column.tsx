import { Button } from "@openpromo/ui/components/button";
import type { ColumnDef } from "@tanstack/react-table";
import type { MergedContentEntity } from "@worker/routes/api/workspaces/content";
import { format, isThisWeek, isToday, isTomorrow } from "date-fns";
import { ArrowUpDown, Calendar } from "lucide-react";
import { matchEntity } from "@/lib/hono-client";

function formatScheduledDate(date: Date): {
  primary: string;
  secondary: string;
} {
  if (isToday(date)) {
    return {
      primary: "Today",
      secondary: format(date, "h:mm a"),
    };
  }

  if (isTomorrow(date)) {
    return {
      primary: "Tomorrow",
      secondary: format(date, "h:mm a"),
    };
  }

  if (isThisWeek(date)) {
    return {
      primary: format(date, "EEEE"),
      secondary: format(date, "h:mm a"),
    };
  }

  // Future dates
  return {
    primary: format(date, "MMM d"),
    secondary: format(date, "h:mm a"),
  };
}

export const scheduledDateColumn: ColumnDef<MergedContentEntity> = {
  accessorKey: "scheduledDate",
  header: ({ column }) => {
    return (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Scheduled
        <ArrowUpDown />
      </Button>
    );
  },
  cell: ({ row }) => {
    const entity = row.original;

    return matchEntity(entity, {
      content: (contentEntity) => {
        const content = contentEntity.entity;

        // Check if content is scheduled and has a scheduling spec
        if (
          content.publishingStatus === "SCHEDULED" &&
          content.schedulingSpec?.publishAt
        ) {
          const scheduledDate = new Date(content.schedulingSpec.publishAt);
          const { primary, secondary } = formatScheduledDate(scheduledDate);

          return (
            <div className="text-sm">
              <div className="flex items-center gap-1.5 font-medium text-gray-900 dark:text-gray-100">
                <Calendar className="w-3.5 h-3.5 text-blue-500" />
                {primary}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 ml-5">
                {secondary}
              </div>
            </div>
          );
        }

        // For published, draft, or non-scheduled content
        return (
          <div className="text-sm text-gray-400 dark:text-gray-500">—</div>
        );
      },
      group: (groupEntity) => {
        const group = groupEntity.entity;

        // Check if group is scheduled
        if (
          group.publishingStatus === "SCHEDULED" &&
          group.schedulingSpec?.publishAt
        ) {
          const scheduledDate = new Date(group.schedulingSpec.publishAt);
          const { primary, secondary } = formatScheduledDate(scheduledDate);

          return (
            <div className="text-sm">
              <div className="flex items-center gap-1.5 font-medium text-gray-900 dark:text-gray-100">
                <Calendar className="w-3.5 h-3.5 text-blue-500" />
                {primary}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 ml-5">
                {secondary}
              </div>
              <div className="text-xs text-gray-400 dark:text-gray-500 ml-5">
                {groupEntity.contents.length} post
                {groupEntity.contents.length !== 1 ? "s" : ""}
              </div>
            </div>
          );
        }

        // For draft groups or non-scheduled groups
        return (
          <div className="text-sm text-gray-400 dark:text-gray-500">—</div>
        );
      },
    });
  },
};
