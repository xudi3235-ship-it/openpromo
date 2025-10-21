import { Button } from "@openpromo/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@openpromo/ui/components/dropdown-menu";
import {
  CalendarClock,
  Edit,
  Eye,
  MoreHorizontal,
  Trash2,
  Upload,
} from "lucide-react";
import type { CalendarEvent } from "@/components/calendar";

interface CalendarEventCardActionsMenuProps {
  event: CalendarEvent;
  contentPermalink?: string;
  isEditable: boolean;
  canPublish: boolean;
  canReschedule: boolean;
  isPublishing: boolean;
  editLabel: string;
  deleteLabel: string;
  onView: (event: CalendarEvent, e: React.MouseEvent) => void;
  onEdit: (event: CalendarEvent, e: React.MouseEvent) => void;
  onReschedule: (event: CalendarEvent, e: React.MouseEvent) => void;
  onPublish: (event: CalendarEvent, e: React.MouseEvent) => void;
  onDelete: (event: CalendarEvent, e: React.MouseEvent) => void;
}

export function CalendarEventCardActionsMenu({
  event,
  contentPermalink,
  isEditable,
  canPublish,
  canReschedule: canRescheduleEvent,
  isPublishing,
  editLabel,
  deleteLabel,
  onView,
  onEdit,
  onReschedule,
  onPublish,
  onDelete,
}: CalendarEventCardActionsMenuProps) {
  return (
    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 rounded-full bg-gray-200/80 dark:bg-gray-700/80 p-0 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={4} className="w-44">
          <DropdownMenuItem
            onClick={(e) => onView(event, e)}
            disabled={!contentPermalink}
          >
            <Eye className="w-4 h-4 mr-2" /> View content
          </DropdownMenuItem>
          {isEditable && (
            <DropdownMenuItem onClick={(e) => onEdit(event, e)}>
              <Edit className="w-4 h-4 mr-2" />
              {editLabel}
            </DropdownMenuItem>
          )}
          {canRescheduleEvent && (
            <DropdownMenuItem onClick={(e) => onReschedule(event, e)}>
              <CalendarClock className="w-4 h-4 mr-2" /> Reschedule
            </DropdownMenuItem>
          )}
          {canPublish && (
            <DropdownMenuItem
              onClick={(e) => onPublish(event, e)}
              disabled={isPublishing}
            >
              <Upload className="w-4 h-4 mr-2" />
              {isPublishing ? "Publishing..." : "Publish now"}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onClick={(e) => onDelete(event, e)}
            className="text-destructive"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {deleteLabel}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
