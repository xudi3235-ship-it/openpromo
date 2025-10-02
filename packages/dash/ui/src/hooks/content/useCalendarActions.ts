import { useContentActionController } from "./useContentActionController";

/**
 * Calendar-specific hook that combines content actions with delete confirmation
 * Handles calendar-specific event behaviors like stopPropagation
 */
export const useCalendarActions = (onDelete?: (entityId: string) => void) => {
  return useContentActionController({ onDelete, stopPropagation: true });
};
