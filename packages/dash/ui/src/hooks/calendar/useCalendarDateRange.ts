import { endOfMonth, endOfWeek, startOfMonth, startOfWeek } from "date-fns";
import { useMemo } from "react";
import type { CalendarView } from "@/components/calendar/types";

export interface CalendarDateRange {
  fromDate: Date;
  toDate: Date;
}

/**
 * Calculate the date range for calendar views to optimize data fetching
 * - Week view: fetches only the current week (7 days)
 * - Month view: fetches only the current month (~30 days)
 */
export function useCalendarDateRange(
  currentDate: Date,
  view: CalendarView,
): CalendarDateRange {
  return useMemo(() => {
    if (view === "week") {
      return {
        fromDate: startOfWeek(currentDate, { weekStartsOn: 0 }),
        toDate: endOfWeek(currentDate, { weekStartsOn: 0 }),
      };
    } else {
      // month view
      return {
        fromDate: startOfMonth(currentDate),
        toDate: endOfMonth(currentDate),
      };
    }
  }, [currentDate, view]);
}
