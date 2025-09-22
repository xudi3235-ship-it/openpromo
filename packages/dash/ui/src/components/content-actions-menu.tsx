import { Button } from "@openpromo/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@openpromo/ui/components/dropdown-menu";
import { Edit, MoreHorizontal, Trash2 } from "lucide-react";
import type React from "react";
import type { CalendarEvent } from "@/components/calendar";

interface ContentActionsMenuProps {
  entity: CalendarEvent;
  onEdit: (entity: CalendarEvent, e: React.MouseEvent) => void;
  onDelete: (entity: CalendarEvent, e: React.MouseEvent) => void;
  trigger?: React.ReactNode;
  className?: string;
}

/**
 * Reusable dropdown menu component for content actions
 * Provides consistent edit/delete actions across different contexts
 */
export function ContentActionsMenu({
  entity,
  onEdit,
  onDelete,
  trigger,
  className,
}: ContentActionsMenuProps) {
  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(entity, e);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(entity, e);
  };

  const defaultTrigger = (
    <Button
      variant="ghost"
      size="sm"
      className="h-6 w-6 p-0 bg-black/20 hover:bg-black/40 backdrop-blur-sm text-white border-0"
    >
      <MoreHorizontal className="h-3 w-3" />
      <span className="sr-only">Open menu</span>
    </Button>
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
        {trigger || defaultTrigger}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className={className}>
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleEdit}>
          <Edit className="w-4 h-4 mr-2" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleDelete} className="text-destructive">
          <Trash2 className="w-4 h-4 mr-2" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
