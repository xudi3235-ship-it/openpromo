"use client";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@openpromo/ui/components/popover";
import type { PlacementSpec } from "@shared/content";
import type { ContentEntity } from "@worker/routes/api/workspaces/content";
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
import { Image } from "lucide-react";
import type React from "react";
import { useMemo } from "react";
import {
  type CalendarEvent,
  DroppableCell,
  getEventData,
  getEventsForDay,
  getSpanningEventsForDay,
} from "@/components/calendar";
import { DefaultStartHour } from "@/components/calendar/constants";
import { getPlatformIcon } from "@/components/content/utils/platform-icons";
import { matchEntity, matchPlacementSpec } from "@/lib/hono-client";

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

  const handleEventClick = (event: CalendarEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    onEventSelect(event);
  };

  // Helper to get thumbnail URL from placement spec
  const getThumbnailFromPlacement = (
    placementSpec: PlacementSpec,
  ): string | undefined => {
    if (placementSpec?.thumbnailUrl) {
      return placementSpec.thumbnailUrl;
    }

    const attachments = placementSpec?.attachments;
    if (attachments && attachments.length > 0) {
      // biome-ignore lint/suspicious/noExplicitAny: legacy code
      const firstAttachment = attachments.find((att: any) => att.publicUrl);
      if (firstAttachment?.publicUrl) {
        return firstAttachment.publicUrl;
      }
    }

    return undefined;
  };

  // Render event with thumbnail and platform icon
  const renderEventWithThumbnail = (
    event: CalendarEvent,
    onClick: (e: React.MouseEvent) => void,
  ) => {
    return matchEntity(event, {
      content: (entity) => {
        const {
          entity: { placementSpec, placement },
        } = entity as ContentEntity;

        const thumbnailSrc = getThumbnailFromPlacement(
          placementSpec as PlacementSpec,
        );
        const platformIcon = getPlatformIcon(placement);
        const eventData = getEventData(event);

        const message = matchPlacementSpec(placementSpec as PlacementSpec, {
          FBFeed: (s) => s.postSpec.message,
          IGFeed: (s) => s.caption,
          TTFeed: (s) => s.caption,
        });

        return (
          <button
            type="button"
            className="h-full w-full bg-background border border-border rounded-md p-1 text-xs cursor-pointer hover:bg-accent/50 transition-colors overflow-hidden text-left flex items-center gap-2"
            onClick={onClick}
          >
            {/* Thumbnail */}
            <div className="w-8 h-8 flex-shrink-0 rounded overflow-hidden bg-muted">
              {thumbnailSrc ? (
                <img
                  src={thumbnailSrc}
                  alt="Content thumbnail"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <Image className="w-4 h-4 text-muted-foreground" />
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="font-medium text-foreground truncate text-[11px] leading-tight">
                {message || eventData.title}
              </div>
            </div>

            {/* Platform icon */}
            {platformIcon && (
              <div className="w-4 h-4 flex-shrink-0 opacity-70">
                {platformIcon}
              </div>
            )}
          </button>
        );
      },
      group: (entity) => {
        const { contents } = entity;
        const eventData = getEventData(event);

        // Get unique platforms from the contents
        const platforms = [
          ...new Set(contents.map((content) => content.placement)),
        ];

        // Get first thumbnail or default
        const contentWithThumbnail = contents.find(
          (c) =>
            c.placementSpec != null &&
            getThumbnailFromPlacement(c.placementSpec),
        );
        const thumbnailUrl = contentWithThumbnail
          ? getThumbnailFromPlacement(
              contentWithThumbnail.placementSpec as PlacementSpec,
            )
          : undefined;

        // Get the primary message
        const primaryMessage =
          contents.length > 0
            ? matchPlacementSpec(contents[0].placementSpec as PlacementSpec, {
                FBFeed: (s) => s.postSpec.message,
                IGFeed: (s) => s.caption,
                TTFeed: (s) => s.caption,
              })
            : "Untitled Group";

        return (
          <button
            type="button"
            className="h-full w-full bg-background border border-border rounded-md p-1 text-xs cursor-pointer hover:bg-accent/50 transition-colors overflow-hidden text-left flex items-center gap-2"
            onClick={onClick}
          >
            {/* Thumbnail */}
            <div className="w-8 h-8 flex-shrink-0 rounded overflow-hidden bg-muted">
              {thumbnailUrl ? (
                <img
                  src={thumbnailUrl}
                  alt="Content thumbnail"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <Image className="w-4 h-4 text-muted-foreground" />
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="font-medium text-foreground truncate text-[11px] leading-tight">
                {primaryMessage || eventData.title}
              </div>
              <div className="text-muted-foreground text-[10px] truncate">
                {contents.length} post{contents.length !== 1 ? "s" : ""}
              </div>
            </div>

            {/* Platform icons stack */}
            <div className="flex gap-0.5 flex-shrink-0">
              {platforms.slice(0, 2).map((platform) => {
                const platformIcon = getPlatformIcon(platform);
                return platformIcon ? (
                  <div key={platform} className="w-3 h-3 opacity-70">
                    {platformIcon}
                  </div>
                ) : null;
              })}
              {platforms.length > 2 && (
                <div className="w-3 h-3 bg-muted rounded-full flex items-center justify-center">
                  <span className="text-[8px] font-semibold text-muted-foreground">
                    +{platforms.length - 2}
                  </span>
                </div>
              )}
            </div>
          </button>
        );
      },
    });
  };

  // Render individual events up to limit, then more button
  const renderDayEvents = (dayEvents: CalendarEvent[], day: Date) => {
    const maxVisible = 5;
    const visibleEvents = dayEvents.slice(0, maxVisible);
    const remainingCount = dayEvents.length - maxVisible;

    return (
      <>
        {/* Render individual events */}
        {visibleEvents.map((event) => {
          const eventData = getEventData(event);
          return (
            <div key={eventData.id} className="w-full h-10 mb-1">
              {renderEventWithThumbnail(event, (e) =>
                handleEventClick(event, e),
              )}
            </div>
          );
        })}

        {/* More button for remaining events */}
        {remainingCount > 0 && (
          <Popover modal>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="w-full h-8 mb-1 bg-muted/50 hover:bg-muted border border-dashed border-muted-foreground/30 rounded-md text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="font-medium">+{remainingCount} more</span>
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
                      <div key={eventData.id} className="h-12">
                        {renderEventWithThumbnail(event, (e) =>
                          handleEventClick(event, e),
                        )}
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
    <div data-slot="month-view" className="contents">
      <div className="border-border/70 grid grid-cols-7 border-b sticky top-0 z-40 bg-background backdrop-blur-sm">
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
          gridTemplateRows: "repeat(auto-fit, minmax(180px, 1fr))",
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
                  className="group border-border/70 data-outside-cell:bg-muted/25 data-outside-cell:text-muted-foreground/70 border-r border-b last:border-r-0 overflow-hidden flex flex-col min-h-[180px]"
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
                    <div className="relative h-8 mb-2">
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
                          <span className="truncate">
                            {isToday(day) ? "Create Post" : "Schedule Post"}
                          </span>
                        </button>
                      )}
                    </div>
                    <div className="flex-1 min-h-0 space-y-1 overflow-y-auto">
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
