"use client";

import { useDraggable } from "@dnd-kit/core";
import { cn } from "@openpromo/ui/lib/utils";
import {
  eachDayOfInterval,
  endOfWeek,
  format,
  isBefore,
  isSameDay,
  isToday,
  startOfDay,
  startOfWeek,
} from "date-fns";
import type React from "react";
import { useMemo } from "react";
import { toast } from "sonner";
import {
  type CalendarEvent,
  DroppableCell,
  getEventData,
  isMultiDayEvent,
  useCalendarDnd,
} from "@/components/calendar";
import { matchEntity } from "@/lib/hono-client";
import { CalendarEventCard } from "./calendar-event-card";
import { EmptyStateButton } from "./empty-state-button";

interface DynamicWeekViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventSelect: (event: CalendarEvent) => void;
  onEventCreate: (startTime: Date) => void;
  onEventDelete?: (eventId: string) => void;
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
  const dragId = `${eventData.id}-week`;

  const publishingStatus = matchEntity(event, {
    content: (entity) => entity.entity.publishingStatus,
    group: (entity) => entity.entity.publishingStatus,
  });

  const isDraggable =
    publishingStatus === "DRAFT" || publishingStatus === "SCHEDULED";
  const isActiveDrag = isDraggable && activeId === dragId;
  const isDimmed = Boolean(activeId && activeId !== dragId);

  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: dragId,
      data: {
        event,
        view: "week",
      },
      disabled: !isDraggable,
    });

  const draggableListeners = isDraggable ? listeners : undefined;
  const draggableAttributes = isDraggable ? attributes : undefined;

  // Don't render if being dragged
  if (isDragging || isActiveDrag) {
    return <div ref={setNodeRef} className="opacity-0 h-32" />;
  }

  return (
    <div
      ref={setNodeRef}
      {...(draggableListeners || {})}
      {...(draggableAttributes || {})}
      className={cn(
        "h-full transition-opacity duration-150",
        isDraggable && "touch-none cursor-grab",
        isDimmed && "opacity-40",
      )}
      style={{
        transform: transform
          ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
          : undefined,
      }}
    >
      <div
        className={cn(
          "h-full",
          isActiveDrag && "ring-2 ring-primary/60 ring-offset-2",
        )}
        data-draggable={isDraggable || undefined}
      >
        {children}
      </div>
    </div>
  );
}

export function DynamicWeekView({
  currentDate,
  events,
  onEventSelect,
  onEventCreate,
  onEventDelete,
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

  const isCreatableDay = (day: Date) =>
    !isBefore(startOfDay(day), startOfDay(new Date()));

  const handleCreateEvent = (day: Date) => {
    if (!isCreatableDay(day)) {
      toast.warning("Cannot create events in the past.");
      return;
    }
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
              className={cn(
                "relative flex-1 p-2 min-h-0 transition-colors",
                isCreatableDay(day)
                  ? "cursor-pointer hover:bg-accent/10"
                  : "cursor-not-allowed opacity-80",
              )}
              onClick={() => handleCreateEvent(day)}
            >
              <div className="space-y-2 h-full">
                {/* Events list */}
                {eventsForDay.map((event) => {
                  const eventData = getEventData(event);
                  return (
                    <div
                      key={eventData.id}
                      className="h-32 w-full" // Updated to match card min-height of 120px + spacing
                    >
                      <DraggableCalendarCard event={event}>
                        <CalendarEventCard
                          event={event}
                          onClick={(e) => handleEventClick(event, e)}
                          onDelete={onEventDelete}
                          showTime
                        />
                      </DraggableCalendarCard>
                    </div>
                  );
                })}

                {/* Empty state / create button */}
                {eventsForDay.length === 0 && isCreatableDay(day) && (
                  <div className="h-32 w-full">
                    <EmptyStateButton
                      day={day}
                      onClick={handleCreateEvent}
                      variant="large"
                      className="h-full"
                    />
                  </div>
                )}

                {/* Add button at the bottom if there are events */}
                {eventsForDay.length > 0 && isCreatableDay(day) && (
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
