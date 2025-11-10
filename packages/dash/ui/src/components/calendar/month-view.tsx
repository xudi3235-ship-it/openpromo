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
  isAfter,
  isBefore,
  isSameMonth,
  isToday,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import type React from "react";
import { useMemo } from "react";
import { toast } from "sonner";
import {
  type CalendarEvent,
  CalendarEventCardCompact,
  DroppableCell,
  getEventData,
  getEventsForDay,
  getSpanningEventsForDay,
} from "@/components/calendar";
import { DefaultStartHour } from "@/components/calendar/constants";
import { matchEntity } from "@/lib/hono-client";

interface MonthViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventSelect: (event: CalendarEvent) => void;
  onEventCreate: (startTime: Date) => void;
}

export function MonthView({
  currentDate,
  events,
  onEventSelect,
  onEventCreate,
}: MonthViewProps) {
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

  const getPublishingStatus = (event: CalendarEvent) =>
    matchEntity(event, {
      content: (entity) => entity.entity.publishingStatus,
      group: (entity) => entity.entity.publishingStatus,
    });

  const isPastEvent = (event: CalendarEvent) => {
    const { start } = getEventData(event);
    return isBefore(new Date(start), new Date());
  };

  const handleEventClick = (event: CalendarEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    const status = getPublishingStatus(event);

    if (status !== "DRAFT" && isPastEvent(event)) {
      toast.warning("Past events can't be edited.");
      return;
    }

    if (status === "PUBLISHED") {
      toast.warning("Published events can't be edited.");
      return;
    }

    onEventSelect(event);
  };

  // Render individual events up to limit, then more button
  const renderDayEvents = (dayEvents: CalendarEvent[], day: Date) => {
    const maxVisible = 3;
    const visibleEvents = dayEvents.slice(0, maxVisible);
    const remainingCount = dayEvents.length - maxVisible;

    return (
      <>
        {/* Render individual events */}
        {visibleEvents.map((event) => {
          const eventData = getEventData(event);
          return (
            <div key={eventData.id} className="w-full">
              <CalendarEventCardCompact
                event={event}
                onClick={(e: React.MouseEvent) => handleEventClick(event, e)}
              />
            </div>
          );
        })}

        {/* More button for remaining events */}
        {remainingCount > 0 && (
          <Popover modal>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="w-full h-6 bg-muted/50 hover:bg-muted border border-dashed border-muted-foreground/30 rounded-md text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="font-medium text-[10px]">
                  +{remainingCount}
                </span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="max-w-80 p-3">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">
                    {format(day, "EEE d")}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {dayEvents.length} events
                  </div>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {dayEvents.slice(maxVisible).map((event) => {
                    const eventData = getEventData(event);
                    return (
                      <div key={eventData.id} className="mb-2">
                        <CalendarEventCardCompact
                          event={event}
                          onClick={(e: React.MouseEvent) =>
                            handleEventClick(event, e)
                          }
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )}
      </>
    );
  };

  return (
    <div data-slot="month-view" className="flex flex-col h-full w-full">
      <div className="border-border/70 grid grid-cols-7 border-b sticky top-0 z-40 bg-background backdrop-blur-sm flex-shrink-0">
        {weekdays.map((day) => (
          <div
            key={day}
            className="text-muted-foreground/70 py-2 text-center text-sm"
          >
            {day}
          </div>
        ))}
      </div>
      <div className="grid flex-1 min-h-0 auto-rows-fr">
        {weeks.map((week, weekIndex) => (
          <div
            key={`week-${
              // biome-ignore lint/suspicious/noArrayIndexKey: TODO
              weekIndex
            }`}
            className="grid grid-cols-7 [&:last-child>*]:border-b-0"
          >
            {week.map((day) => {
              if (!day) return null; // Skip if day is undefined

              const dayEvents = getEventsForDay(events, day);
              const spanningEvents = getSpanningEventsForDay(events, day);
              const isCurrentMonth = isSameMonth(day, currentDate);
              const cellId = `month-cell-${day.toISOString()}`;
              const allDayEvents = [...spanningEvents, ...dayEvents];

              return (
                <div
                  key={day.toString()}
                  className="group border-border/70 data-outside-cell:bg-muted/25 data-outside-cell:text-muted-foreground/70 border-r border-b last:border-r-0 overflow-hidden flex flex-col relative"
                  data-today={isToday(day) || undefined}
                  data-outside-cell={!isCurrentMonth || undefined}
                >
                  <DroppableCell
                    id={cellId}
                    date={day}
                    className="flex flex-col h-full"
                    onClick={() => {
                      const startTime = new Date(day);
                      startTime.setHours(DefaultStartHour, 0, 0);
                      onEventCreate(startTime);
                    }}
                  >
                    {/* Day number - sticky at top, overlays events on scroll */}
                    <div className="sticky top-0 z-10 flex-shrink-0">
                      <div className="relative h-7">
                        {/* Default state - show date */}
                        <div className="group-data-today:bg-primary group-data-today:text-primary-foreground mt-1 inline-flex size-6 items-center justify-center rounded-full text-sm font-medium shrink-0 group-hover:opacity-0 transition-opacity">
                          {format(day, "d")}
                        </div>

                        {/* Hover state - show CTA button (only for current/future days) */}
                        {(isToday(day) ||
                          isAfter(startOfDay(day), startOfDay(new Date()))) && (
                          <button
                            type="button"
                            onClick={() => {
                              const startTime = new Date(day);
                              startTime.setHours(DefaultStartHour, 0, 0);
                              onEventCreate(startTime);
                            }}
                            className="absolute inset-0 opacity-0 group-hover:opacity-100 w-full h-7 border border-dashed border-primary/30 bg-primary/5 rounded flex items-center justify-center text-primary/80 text-xs hover:border-primary/50 hover:bg-primary/10 transition-all font-medium"
                          >
                            <span className="truncate text-[11px]">
                              {isToday(day) ? "Create Post" : "Schedule Post"}
                            </span>
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex-1 min-h-0 space-y-1 overflow-y-auto py-1">
                      {/* Render day events with limit and more button */}
                      {renderDayEvents(allDayEvents, day)}
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
