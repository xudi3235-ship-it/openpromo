"use client";

import { cn } from "@openpromo/ui/lib/utils";
import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isSameMonth,
  isToday,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ChevronRight } from "lucide-react";
import type React from "react";
import { useMemo, useState } from "react";
import {
  type CalendarEvent,
  DroppableCell,
  getEventData,
  getEventsForDay,
  getSpanningEventsForDay,
} from "@/components/calendar";
import { DefaultStartHour } from "@/components/calendar/constants";
import { CalendarDayDensityDots } from "./calendar-day-density-dots";
import { CalendarDayEventsSheet } from "./calendar-day-events-sheet";
import { CalendarEventCardMini } from "./calendar-event-card-mini";

interface MonthViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventSelect: (event: CalendarEvent) => void;
  onEventCreate: (startTime: Date) => void;
  onEventDelete?: (eventId: string) => void;
}

export function MonthView({
  currentDate,
  events,
  onEventSelect,
  onEventCreate,
  onEventDelete,
}: MonthViewProps) {
  const [sheetState, setSheetState] = useState<{
    open: boolean;
    day: Date;
    events: CalendarEvent[];
  }>({ open: false, day: new Date(), events: [] });

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

  // Click handler delegates to parent - let the card handle published vs editable
  const handleEventClick = (event: CalendarEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    onEventSelect(event);
  };

  const openEventsSheet = (day: Date, dayEvents: CalendarEvent[]) => {
    setSheetState({ open: true, day, events: dayEvents });
  };

  // Render individual events up to limit, then "more" button
  const renderDayEvents = (dayEvents: CalendarEvent[], day: Date) => {
    const maxVisible = 2; // Show max 2 cards
    const visibleEvents = dayEvents.slice(0, maxVisible);
    const remainingCount = dayEvents.length - maxVisible;

    return (
      <>
        {/* Render individual events */}
        {visibleEvents.map((event) => {
          const eventData = getEventData(event);
          return (
            <CalendarEventCardMini
              key={eventData.id}
              event={event}
              onClick={(e: React.MouseEvent) => handleEventClick(event, e)}
            />
          );
        })}

        {/* More button for remaining events - opens side panel */}
        {remainingCount > 0 && (
          <button
            type="button"
            className="w-full h-5 bg-muted/30 hover:bg-muted/60 rounded-sm text-[10px] text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-0.5"
            onClick={(e) => {
              e.stopPropagation();
              openEventsSheet(day, dayEvents);
            }}
          >
            <span className="font-medium">{remainingCount} more</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </>
    );
  };

  return (
    <>
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
                // biome-ignore lint/suspicious/noArrayIndexKey: stable week order
                weekIndex
              }`}
              className="grid grid-cols-7 [&:last-child>*]:border-b-0"
            >
              {week.map((day) => {
                if (!day) return null;

                const dayEvents = getEventsForDay(events, day);
                const spanningEvents = getSpanningEventsForDay(events, day);
                const isCurrentMonth = isSameMonth(day, currentDate);
                const cellId = `month-cell-${day.toISOString()}`;
                const allDayEvents = [...spanningEvents, ...dayEvents];
                const isFutureOrToday =
                  isToday(day) ||
                  isAfter(startOfDay(day), startOfDay(new Date()));

                return (
                  <div
                    key={day.toString()}
                    className={cn(
                      "group border-border/70 border-r border-b last:border-r-0 overflow-hidden flex flex-col relative",
                      !isCurrentMonth && "bg-muted/25 text-muted-foreground/70",
                    )}
                    data-today={isToday(day) || undefined}
                  >
                    <DroppableCell
                      id={cellId}
                      date={day}
                      className="flex flex-col h-full p-1"
                      onClick={() => {
                        if (!isFutureOrToday) return;
                        const startTime = new Date(day);
                        startTime.setHours(DefaultStartHour, 0, 0);
                        onEventCreate(startTime);
                      }}
                    >
                      {/* Day header - date number + density dots */}
                      <div className="flex items-center justify-between mb-1 flex-shrink-0">
                        <div className="flex items-center gap-1">
                          <div
                            className={cn(
                              "inline-flex size-6 items-center justify-center rounded-full text-sm font-medium",
                              isToday(day) &&
                                "bg-primary text-primary-foreground",
                            )}
                          >
                            {format(day, "d")}
                          </div>
                          <CalendarDayDensityDots
                            events={allDayEvents}
                            maxDots={5}
                          />
                        </div>

                        {/* Hover CTA for future days */}
                        {isFutureOrToday && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const startTime = new Date(day);
                              startTime.setHours(DefaultStartHour, 0, 0);
                              onEventCreate(startTime);
                            }}
                            className="opacity-0 group-hover:opacity-100 text-[10px] text-primary hover:text-primary/80 transition-opacity font-medium"
                          >
                            + Add
                          </button>
                        )}
                      </div>

                      {/* Events list */}
                      <div className="flex-1 min-h-0 space-y-0.5 overflow-hidden">
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

      {/* Side panel sheet for viewing all events on a day */}
      <CalendarDayEventsSheet
        day={sheetState.day}
        events={sheetState.events}
        open={sheetState.open}
        onOpenChange={(open) => setSheetState((s) => ({ ...s, open }))}
        onEventClick={handleEventClick}
        onEventDelete={onEventDelete}
      />
    </>
  );
}
