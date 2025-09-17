"use client";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@openpromo/ui/components/popover";
import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import {
  type CalendarEvent,
  CompactEventGap,
  CompactEventHeight,
  DraggableEvent,
  DroppableCell,
  EventGap,
  EventHeight,
  EventItem,
  getAllEventsForDay,
  getEventData,
  getEventDataWithContext,
  getEventsForDay,
  getSpanningEventsForDay,
  groupCloseEvents,
  sortEvents,
  useEventVisibility,
} from "@/components/calendar";
import { DefaultStartHour } from "@/components/calendar/constants";

interface MonthViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventSelect: (event: CalendarEvent) => void;
  onEventCreate: (startTime: Date) => void;
  compactMode?: boolean; // Enable compact layout for dense content
}

export function MonthView({
  currentDate,
  events,
  onEventSelect,
  onEventCreate,
  compactMode = true, // Default to compact for better content density
}: MonthViewProps) {
  // Use compact dimensions when enabled
  const eventHeight = compactMode ? CompactEventHeight : EventHeight;
  const eventGap = compactMode ? CompactEventGap : EventGap;
  const days = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentDate]);

  const weekdays = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => {
      const date = addDays(startOfWeek(new Date()), i);
      return format(date, "EEE");
    });
  }, []);

  const weeks = useMemo(() => {
    const result = [];
    let week = [];

    for (let i = 0; i < days.length; i++) {
      week.push(days[i]);
      if (week.length === 7 || i === days.length - 1) {
        result.push(week);
        week = [];
      }
    }

    return result;
  }, [days]);

  const handleEventClick = (event: CalendarEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    onEventSelect(event);
  };

  // Render a group of closely-spaced events
  const renderEventGroup = (
    group: CalendarEvent[],
    groupIndex: number,
    day: Date,
  ) => {
    if (group.length === 1) {
      // Single event - render normally
      const event = group[0];
      const eventData = getEventDataWithContext(event, events);
      const eventStart = new Date(eventData.start);
      const eventEnd = new Date(eventData.end);
      const isFirstDay = isSameDay(day, eventStart);
      const isLastDay = isSameDay(day, eventEnd);

      return (
        <DraggableEvent
          key={eventData.id}
          event={event}
          view="month"
          onClick={(e) => handleEventClick(event, e)}
          isFirstDay={isFirstDay}
          isLastDay={isLastDay}
        />
      );
    }

    // Multiple events - render as compact group
    const firstEvent = group[0];
    const firstEventData = getEventData(firstEvent);

    return (
      <div key={`group-${groupIndex}`} className="relative">
        {/* Main event display - show first event prominently */}
        <DraggableEvent
          event={firstEvent}
          view="month"
          onClick={(e) => handleEventClick(firstEvent, e)}
          isFirstDay={true}
          isLastDay={true}
        />

        {/* Stacked indicator for additional events */}
        {group.length > 1 && (
          <div className="absolute -right-0.5 -top-0.5 flex items-center justify-center w-5 h-5 bg-orange-500 text-white text-[9px] font-bold rounded-full border border-background">
            {group.length}
          </div>
        )}

        {/* Tooltip or click handler for viewing all events in group */}
        {group.length > 1 && (
          <Popover modal>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="absolute inset-0 opacity-0 hover:opacity-10 bg-black transition-opacity"
                onClick={(e) => e.stopPropagation()}
              />
            </PopoverTrigger>
            <PopoverContent className="max-w-64 p-3">
              <div className="space-y-2">
                <div className="text-sm font-medium">
                  {group.length} posts at{" "}
                  {format(firstEventData.start, "h:mm a")}
                </div>
                <div className="space-y-1">
                  {group.map((event) => {
                    const eventData = getEventData(event);
                    return (
                      <button
                        key={eventData.id}
                        type="button"
                        className="flex items-center justify-between p-2 rounded border cursor-pointer hover:bg-muted/50 w-full"
                        onClick={(e) => handleEventClick(event, e)}
                      >
                        <span className="text-xs font-medium">
                          {eventData.title}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {format(eventData.start, "h:mm a")}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
    );
  };

  const [referencedCell, setReferencedCell] = useState<HTMLDivElement | null>(
    null,
  );
  const [isMounted, setIsMounted] = useState(false);
  const { getVisibleEventCount } = useEventVisibility({
    referencedCell: referencedCell,
    eventHeight: eventHeight,
    eventGap: eventGap,
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <div data-slot="month-view" className="contents">
      <div className="border-border/70 grid grid-cols-7 border-b">
        {weekdays.map((day) => (
          <div
            key={day}
            className="text-muted-foreground/70 py-2 text-center text-sm"
          >
            {day}
          </div>
        ))}
      </div>
      <div
        className="grid flex-1 auto-rows-fr min-h-0"
        style={{
          gridTemplateRows: "repeat(auto-fit, minmax(120px, 1fr))",
        }}
      >
        {weeks.map((week, weekIndex) => (
          <div
            key={`week-${
              // biome-ignore lint/suspicious/noArrayIndexKey: TODO
              weekIndex
            }`}
            className="grid grid-cols-7 [&:last-child>*]:border-b-0"
          >
            {week.map((day, dayIndex) => {
              if (!day) return null; // Skip if day is undefined

              const dayEvents = getEventsForDay(events, day);
              const spanningEvents = getSpanningEventsForDay(events, day);
              const isCurrentMonth = isSameMonth(day, currentDate);
              const cellId = `month-cell-${day.toISOString()}`;
              const allDayEvents = [...spanningEvents, ...dayEvents];
              const allEvents = getAllEventsForDay(events, day);

              // Group close events for better layout
              const eventGroups = groupCloseEvents(allDayEvents, 15);

              const isReferenceCell = weekIndex === 0 && dayIndex === 0;
              const visibleCount = isMounted
                ? getVisibleEventCount(eventGroups.length)
                : undefined;
              const hasMore =
                visibleCount !== undefined && eventGroups.length > visibleCount;
              const remainingCount = hasMore
                ? eventGroups.length - visibleCount
                : 0;

              return (
                <div
                  key={day.toString()}
                  className="group border-border/70 data-outside-cell:bg-muted/25 data-outside-cell:text-muted-foreground/70 border-r border-b last:border-r-0 overflow-hidden flex flex-col min-h-[120px]"
                  data-today={isToday(day) || undefined}
                  data-outside-cell={!isCurrentMonth || undefined}
                >
                  <DroppableCell
                    id={cellId}
                    date={day}
                    onClick={() => {
                      const startTime = new Date(day);
                      startTime.setHours(DefaultStartHour, 0, 0);
                      onEventCreate(startTime);
                    }}
                  >
                    <div className="group-data-today:bg-primary group-data-today:text-primary-foreground mt-1 mb-1 inline-flex size-6 items-center justify-center rounded-full text-sm font-medium shrink-0">
                      {format(day, "d")}
                    </div>
                    <div
                      ref={(el) => {
                        if (isReferenceCell) {
                          setReferencedCell(el);
                        }
                      }}
                      className="flex-1 min-h-0 space-y-0.5"
                      style={
                        {
                          "--event-height": `${eventHeight}px`,
                          "--event-gap": `${eventGap}px`,
                        } as React.CSSProperties
                      }
                    >
                      {eventGroups.map((group, groupIndex) => {
                        // Check if this group should be hidden based on visibility limit
                        const isGroupHidden =
                          isMounted &&
                          visibleCount &&
                          groupIndex >= visibleCount;

                        if (!visibleCount || isGroupHidden) return null;

                        // Create a stable key from event IDs in the group
                        const groupKey = group
                          .map((event) => getEventData(event).id)
                          .join("-");

                        return (
                          <div
                            key={`group-${groupKey}`}
                            className="aria-hidden:hidden"
                            aria-hidden={isGroupHidden ? "true" : undefined}
                          >
                            {renderEventGroup(group, groupIndex, day)}
                          </div>
                        );
                      })}

                      {hasMore && (
                        <Popover modal>
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              className="focus-visible:border-ring focus-visible:ring-ring/50 text-muted-foreground hover:text-foreground hover:bg-muted/50 flex h-[var(--event-height)] w-full items-center overflow-hidden px-1.5 text-left text-[10px] backdrop-blur-md transition outline-none select-none focus-visible:ring-[3px] rounded-sm border border-dashed border-muted-foreground/30 sm:px-2 sm:text-xs"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <span className="font-medium">
                                +{remainingCount} more
                              </span>
                            </button>
                          </PopoverTrigger>
                          <PopoverContent
                            align="center"
                            className="max-w-64 p-3"
                            style={
                              {
                                "--event-height": `${eventHeight}px`,
                              } as React.CSSProperties
                            }
                          >
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="text-sm font-medium">
                                  {format(day, "EEE d")}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {allEvents.length} events
                                </div>
                              </div>
                              <div className="space-y-1 max-h-64 overflow-y-auto">
                                {sortEvents(allEvents).map((event) => {
                                  const eventData = getEventData(event);
                                  const eventStart = new Date(eventData.start);
                                  const eventEnd = new Date(eventData.end);
                                  const isFirstDay = isSameDay(day, eventStart);
                                  const isLastDay = isSameDay(day, eventEnd);

                                  return (
                                    <EventItem
                                      key={eventData.id}
                                      onClick={(e) =>
                                        handleEventClick(event, e)
                                      }
                                      event={event}
                                      view="month"
                                      isFirstDay={isFirstDay}
                                      isLastDay={isLastDay}
                                    />
                                  );
                                })}
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>
                  </DroppableCell>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
