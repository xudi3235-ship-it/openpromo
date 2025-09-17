import type { UnifiedContentSelect } from "@core/schemas/content.sql";
import { isSameDay } from "date-fns";
import type { CalendarEvent, EventColor } from "@/components/calendar";
import { matchEntity } from "@/lib/hono-client";

/**
 * Extract calendar-relevant data from MergedContentEntity
 */
interface EventData {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  color: EventColor;
}

export function getEventData(event: CalendarEvent): EventData {
  return matchEntity(event, {
    group: (groupEntity): EventData => {
      const group = groupEntity.entity;
      return {
        id: String(group.id),
        title: "Content Group",
        start: new Date(group.createdAt),
        end: new Date(new Date(group.createdAt).getTime() + 60 * 60 * 1000), // 1 hour later
        allDay: false,
        color: "violet",
      };
    },
    content: (contentEntity): EventData => {
      const { entity: content } = contentEntity as {
        entity: UnifiedContentSelect;
      };

      // Check if content is scheduled
      const isScheduled =
        content.publishingStatus === "SCHEDULED" &&
        // Use scheduled date if available, otherwise use createdAt
        content.placementSpec?.schedulingSpec?.publishAt;
      const eventDate = isScheduled
        ? new Date(content.placementSpec?.schedulingSpec?.publishAt ?? "")
        : new Date(content.createdAt);

      return {
        id: String(content.id),
        title: content.placement.replace("_", " "),
        start: eventDate,
        end: new Date(eventDate.getTime() + 60 * 60 * 1000), // 1 hour later
        allDay: false,
        color: content.placement.startsWith("FB_") ? "sky" : "rose",
      };
    },
  });
}

/**
 * Get CSS classes for event colors
 */
export function getEventColorClasses(color?: EventColor | string): string {
  const eventColor = color || "sky";

  switch (eventColor) {
    case "sky":
      return "bg-sky-200/50 hover:bg-sky-200/40 text-sky-950/80 dark:bg-sky-400/25 dark:hover:bg-sky-400/20 dark:text-sky-200 shadow-sky-700/8";
    case "amber":
      return "bg-amber-200/50 hover:bg-amber-200/40 text-amber-950/80 dark:bg-amber-400/25 dark:hover:bg-amber-400/20 dark:text-amber-200 shadow-amber-700/8";
    case "violet":
      return "bg-violet-200/50 hover:bg-violet-200/40 text-violet-950/80 dark:bg-violet-400/25 dark:hover:bg-violet-400/20 dark:text-violet-200 shadow-violet-700/8";
    case "rose":
      return "bg-rose-200/50 hover:bg-rose-200/40 text-rose-950/80 dark:bg-rose-400/25 dark:hover:bg-rose-400/20 dark:text-rose-200 shadow-rose-700/8";
    case "emerald":
      return "bg-emerald-200/50 hover:bg-emerald-200/40 text-emerald-950/80 dark:bg-emerald-400/25 dark:hover:bg-emerald-400/20 dark:text-emerald-200 shadow-emerald-700/8";
    case "orange":
      return "bg-orange-200/50 hover:bg-orange-200/40 text-orange-950/80 dark:bg-orange-400/25 dark:hover:bg-orange-400/20 dark:text-orange-200 shadow-orange-700/8";
    default:
      return "bg-sky-200/50 hover:bg-sky-200/40 text-sky-950/80 dark:bg-sky-400/25 dark:hover:bg-sky-400/20 dark:text-sky-200 shadow-sky-700/8";
  }
}

/**
 * Get CSS classes for border radius based on event position in multi-day events
 */
export function getBorderRadiusClasses(
  isFirstDay: boolean,
  isLastDay: boolean,
): string {
  if (isFirstDay && isLastDay) {
    return "rounded"; // Both ends rounded
  } else if (isFirstDay) {
    return "rounded-l rounded-r-none"; // Only left end rounded
  } else if (isLastDay) {
    return "rounded-r rounded-l-none"; // Only right end rounded
  } else {
    return "rounded-none"; // No rounded corners
  }
}

/**
 * Check if an event is a multi-day event
 */
export function isMultiDayEvent(event: CalendarEvent): boolean {
  const data: EventData = getEventData(event);
  const eventStart = new Date(data.start);
  const eventEnd = new Date(data.end);
  return data.allDay || eventStart.getDate() !== eventEnd.getDate();
}

/**
 * Filter events for a specific day
 */
export function getEventsForDay(
  events: CalendarEvent[],
  day: Date,
): CalendarEvent[] {
  return events
    .filter((event) => {
      const data: EventData = getEventData(event);
      return isSameDay(day, data.start);
    })
    .sort((a, b) => {
      const aData: EventData = getEventData(a);
      const bData: EventData = getEventData(b);
      return aData.start.getTime() - bData.start.getTime();
    });
}

/**
 * Sort events with multi-day events first, then by start time
 */
export function sortEvents(events: CalendarEvent[]): CalendarEvent[] {
  return [...events].sort((a, b) => {
    const aIsMultiDay = isMultiDayEvent(a);
    const bIsMultiDay = isMultiDayEvent(b);

    if (aIsMultiDay && !bIsMultiDay) return -1;
    if (!aIsMultiDay && bIsMultiDay) return 1;

    const aData: EventData = getEventData(a);
    const bData: EventData = getEventData(b);
    return aData.start.getTime() - bData.start.getTime();
  });
}

/**
 * Get multi-day events that span across a specific day (but don't start on that day)
 */
export function getSpanningEventsForDay(
  events: CalendarEvent[],
  day: Date,
): CalendarEvent[] {
  return events.filter((event) => {
    if (!isMultiDayEvent(event)) return false;

    const data: EventData = getEventData(event);
    const eventStart = new Date(data.start);
    const eventEnd = new Date(data.end);

    // Only include if it's not the start day but is either the end day or a middle day
    return (
      !isSameDay(day, eventStart) &&
      (isSameDay(day, eventEnd) || (day > eventStart && day < eventEnd))
    );
  });
}

/**
 * Get all events visible on a specific day (starting, ending, or spanning)
 */
export function getAllEventsForDay(
  events: CalendarEvent[],
  day: Date,
): CalendarEvent[] {
  return events.filter((event) => {
    const data: EventData = getEventData(event);
    const eventStart = new Date(data.start);
    const eventEnd = new Date(data.end);
    return (
      isSameDay(day, eventStart) ||
      isSameDay(day, eventEnd) ||
      (day > eventStart && day < eventEnd)
    );
  });
}

/**
 * Get all events for a day (for agenda view)
 */
export function getAgendaEventsForDay(
  events: CalendarEvent[],
  day: Date,
): CalendarEvent[] {
  return events
    .filter((event) => {
      const data: EventData = getEventData(event);
      const eventStart = new Date(data.start);
      const eventEnd = new Date(data.end);
      return (
        isSameDay(day, eventStart) ||
        isSameDay(day, eventEnd) ||
        (day > eventStart && day < eventEnd)
      );
    })
    .sort((a, b) => {
      const aData: EventData = getEventData(a);
      const bData: EventData = getEventData(b);
      return aData.start.getTime() - bData.start.getTime();
    });
}

/**
 * Add hours to a date
 */
export function addHoursToDate(date: Date, hours: number): Date {
  const result = new Date(date);
  result.setHours(result.getHours() + hours);
  return result;
}
