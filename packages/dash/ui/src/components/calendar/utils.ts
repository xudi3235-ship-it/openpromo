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

/**
 * Calculate smart event duration to avoid overlaps with nearby events
 */
export function calculateSmartDuration(
  eventStart: Date,
  allEvents: CalendarEvent[],
  currentEventId: string,
): Date {
  // Get all other events on the same day
  const sameDay = allEvents
    .filter((event) => {
      const data = getEventData(event);
      return data.id !== currentEventId && isSameDay(eventStart, data.start);
    })
    .map((event) => getEventData(event))
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  // Find next event after this one
  const nextEvent = sameDay.find(
    (event) => event.start.getTime() > eventStart.getTime(),
  );

  if (nextEvent) {
    // If there's a next event, end this event before it starts
    const timeDiff = nextEvent.start.getTime() - eventStart.getTime();
    if (timeDiff <= 60 * 60 * 1000) {
      // Within 1 hour
      // Use 60% of the time between events, minimum 10 minutes
      const duration = Math.max(10 * 60 * 1000, timeDiff * 0.6);
      return new Date(eventStart.getTime() + duration);
    }
  }

  // Default to 30 minutes for single events or well-spaced events
  return new Date(eventStart.getTime() + 30 * 60 * 1000);
}

/**
 * Enhanced event data with smart duration calculation
 */
export function getEventDataWithContext(
  event: CalendarEvent,
  allEvents: CalendarEvent[],
): EventData {
  const baseData = getEventData(event);
  const smartEndTime = calculateSmartDuration(
    baseData.start,
    allEvents,
    baseData.id,
  );

  return {
    ...baseData,
    end: smartEndTime,
  };
}

/**
 * Group closely-spaced events (within 15 minutes) for compact display
 */
export function groupCloseEvents(
  events: CalendarEvent[],
  timeThresholdMinutes = 15,
): CalendarEvent[][] {
  const sortedEvents = [...events].sort((a, b) => {
    const aData = getEventData(a);
    const bData = getEventData(b);
    return aData.start.getTime() - bData.start.getTime();
  });

  const groups: CalendarEvent[][] = [];
  let currentGroup: CalendarEvent[] = [];

  for (let i = 0; i < sortedEvents.length; i++) {
    const event = sortedEvents[i];
    const eventData = getEventData(event);

    if (currentGroup.length === 0) {
      currentGroup.push(event);
    } else {
      const lastEvent = currentGroup[currentGroup.length - 1];
      const lastEventData = getEventData(lastEvent);
      const timeDiff =
        eventData.start.getTime() - lastEventData.start.getTime();

      if (timeDiff <= timeThresholdMinutes * 60 * 1000) {
        // Add to current group if within threshold
        currentGroup.push(event);
      } else {
        // Start new group
        groups.push(currentGroup);
        currentGroup = [event];
      }
    }
  }

  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  return groups;
}

/**
 * Check if events are closely spaced (for visual indicators)
 */
export function hasCloseEvents(
  events: CalendarEvent[],
  timeThresholdMinutes = 15,
): boolean {
  const groups = groupCloseEvents(events, timeThresholdMinutes);
  return groups.some((group) => group.length > 1);
}
