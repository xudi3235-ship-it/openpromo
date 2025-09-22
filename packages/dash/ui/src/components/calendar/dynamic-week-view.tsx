"use client";

import { useDraggable } from "@dnd-kit/core";
import { cn } from "@openpromo/ui/lib/utils";
import {
  eachDayOfInterval,
  endOfWeek,
  format,
  isSameDay,
  isToday,
  startOfWeek,
} from "date-fns";
import type React from "react";
import { useMemo } from "react";
import {
  type CalendarEvent,
  DraggableEvent,
  DroppableCell,
  getEventData,
  isMultiDayEvent,
  useCalendarDnd,
} from "@/components/calendar";
import { CalendarEventCard } from "./calendar-event-card";
import { EmptyStateButton } from "./empty-state-button";

interface DynamicWeekViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventSelect: (event: CalendarEvent) => void;
  onEventCreate: (startTime: Date) => void;
}

// Draggable wrapper for calendar event cards
function DraggableCalendarCard({
  event,
  children,
}: {
  event: CalendarEvent;
  children: React.ReactNode;
}) {
  const { activeId } = useCalendarDnd();
  const eventData = getEventData(event);

  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `${eventData.id}-week`,
      data: {
        event,
        view: "week",
      },
    });

  // Don't render if being dragged
  if (isDragging || activeId === `${eventData.id}-week`) {
    return <div ref={setNodeRef} className="opacity-0 h-20" />;
  }

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className="touch-none h-full"
      style={{
        transform: transform
          ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
          : undefined,
      }}
    >
      {children}
    </div>
  );
}

export function DynamicWeekView({
  currentDate,
  events,
  onEventSelect,
  onEventCreate,
}: DynamicWeekViewProps) {
  const days = useMemo(() => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: weekStart, end: weekEnd });
  }, [currentDate]);

  // Process events for each day
  const dayEvents = useMemo(() => {
    return days.map((day) => {
      // Get events for this specific day (not multi-day or all-day events)
      const daySpecificEvents = events
        .filter((event) => {
          const eventData = getEventData(event);
          if (eventData.allDay || isMultiDayEvent(event)) return false;

          const eventStart = new Date(eventData.start);
          return isSameDay(day, eventStart);
        })
        .sort((a, b) => {
          // Sort by start time
          const aData = getEventData(a);
          const bData = getEventData(b);
          return (
            new Date(aData.start).getTime() - new Date(bData.start).getTime()
          );
        });

      return { day, events: daySpecificEvents };
    });
  }, [days, events]);

  // Get all-day and multi-day events for the week
  const allDayEvents = useMemo(() => {
    return events.filter((event) => {
      const eventData = getEventData(event);
      return eventData.allDay || isMultiDayEvent(event);
    });
  }, [events]);

  const handleEventClick = (event: CalendarEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    onEventSelect(event);
  };

  const handleCreateEvent = (day: Date) => {
    // Create event at 9 AM by default, or current time if today
    const startTime = new Date(day);
    if (isToday(day)) {
      const now = new Date();
      startTime.setHours(
        now.getHours(),
        Math.ceil(now.getMinutes() / 10) * 10,
        0,
        0,
      );
    } else {
      startTime.setHours(9, 0, 0, 0);
    }
    onEventCreate(startTime);
  };

  const showAllDaySection = allDayEvents.length > 0;

  return (
    <div data-slot="dynamic-week-view" className="flex h-full flex-col">
      {/* Header with day names */}
      <div className="bg-background/80 border-border/70 sticky top-0 z-30 grid grid-cols-7 border-b backdrop-blur-md">
        {days.map((day) => (
          <div
            key={day.toString()}
            className={cn(
              "py-3 text-center border-r border-border/70 last:border-r-0",
              "data-today:bg-accent/50 data-today:font-semibold",
              isToday(day) && "data-today",
            )}
            data-today={isToday(day) || undefined}
          >
            <div className="text-sm text-muted-foreground">
              {format(day, "EEE")}
            </div>
            <div
              className={cn(
                "text-lg",
                isToday(day)
                  ? "text-foreground font-bold"
                  : "text-foreground/80",
              )}
            >
              {format(day, "d")}
            </div>
          </div>
        ))}
      </div>

      {/* All-day events section */}
      {showAllDaySection && (
        <div className="border-border/70 bg-muted/30 border-b p-2">
          <div className="text-xs text-muted-foreground mb-2 font-medium">
            All Day
          </div>
          <div className="space-y-1">
            {allDayEvents.map((event) => (
              <div key={getEventData(event).id} className="h-6">
                <DraggableEvent
                  event={event}
                  view="week"
                  onClick={(e) => handleEventClick(event, e)}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dynamic day columns */}
      <div className="flex-1 grid grid-cols-7 overflow-hidden">
        {dayEvents.map(({ day, events: eventsForDay }) => (
          <div
            key={day.toString()}
            className={cn(
              "border-r border-border/70 last:border-r-0 flex flex-col",
              "bg-background hover:bg-accent/20 transition-colors",
            )}
          >
            {/* Droppable area for the entire day */}
            <DroppableCell
              id={`day-${day.toISOString()}`}
              date={day}
              className="flex-1 p-2 min-h-0"
              onClick={() => handleCreateEvent(day)}
            >
              <div className="space-y-2 h-full">
                {/* Events list */}
                {eventsForDay.map((event) => {
                  const eventData = getEventData(event);
                  return (
                    <div
                      key={eventData.id}
                      className="h-20 w-full" // Increased height for thumbnail display
                    >
                      <DraggableCalendarCard event={event}>
                        <CalendarEventCard
                          event={event}
                          onClick={(e) => handleEventClick(event, e)}
                          showTime
                        />
                      </DraggableCalendarCard>
                    </div>
                  );
                })}

                {/* Empty state / create button */}
                {eventsForDay.length === 0 && (
                  <EmptyStateButton
                    day={day}
                    onClick={handleCreateEvent}
                    variant="large"
                  />
                )}

                {/* Add button at the bottom if there are events */}
                {eventsForDay.length > 0 && (
                  <EmptyStateButton
                    day={day}
                    onClick={handleCreateEvent}
                    variant="small"
                  />
                )}
              </div>
            </DroppableCell>
          </div>
        ))}
      </div>
    </div>
  );
}
