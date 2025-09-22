import type React from "react";
import type { CalendarEvent } from "@/components/calendar";
import { useContentActions } from "./useContentActions";
import { useDeleteConfirmation } from "./useDeleteConfirmation";

/**
 * Calendar-specific hook that combines content actions with delete confirmation
 * Handles calendar-specific event behaviors like stopPropagation
 */
export const useCalendarActions = (onDelete?: (entityId: string) => void) => {
  const { editEntity } = useContentActions();
  const confirmation = useDeleteConfirmation(onDelete);

  const handleDelete = (entity: CalendarEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    confirmation.confirmDelete(entity);
  };

  const handleEdit = (entity: CalendarEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    editEntity(entity);
  };

  return {
    handleDelete,
    handleEdit,
    ...confirmation,
  };
};
