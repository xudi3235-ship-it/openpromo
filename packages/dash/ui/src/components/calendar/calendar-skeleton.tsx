/** biome-ignore-all lint/suspicious/noArrayIndexKey: skeleton */
"use client";

import { Button } from "@openpromo/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@openpromo/ui/components/dropdown-menu";
import { Skeleton } from "@openpromo/ui/components/skeleton";
import { cn } from "@openpromo/ui/lib/utils";
import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import {
  CalendarCheck,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
} from "lucide-react";
import { useMemo } from "react";
import { EventGap, EventHeight } from "@/components/calendar";
import { Route as CalendarRoute } from "@/routes/_authenticated/workspaces/$workspaceSlug/calendar";

export function CalendarSkeleton() {
  const currentDate = new Date();
  const { view = "month" } = CalendarRoute.useSearch();

  const monthDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentDate]);

  const weeks = useMemo(() => {
    const result = [];
    let week = [];

    for (let i = 0; i < monthDays.length; i++) {
      week.push(monthDays[i]);
      if (week.length === 7 || i === monthDays.length - 1) {
        result.push(week);
        week = [];
      }
    }

    return result;
  }, [monthDays]);

  const weekdays = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => {
      const date = addDays(startOfWeek(new Date()), i);
      return format(date, "EEE");
    });
  }, []);

  return (
    <div
      className={cn("h-full w-full flex flex-col")}
      style={
        {
          "--event-height": `${EventHeight}px`,
          "--event-gap": `${EventGap}px`,
        } as React.CSSProperties
      }
    >
      {/* Calendar Header */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center space-x-4">
          <Skeleton className="h-8 w-32" /> {/* Month/Year title */}
          <Button variant="outline" size="sm" disabled>
            <CalendarCheck className="min-[480px]:hidden" size={16} />
            <span className="max-[479px]:sr-only">Today</span>
          </Button>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" disabled>
            <ChevronLeftIcon size={16} />
          </Button>
          <Button variant="outline" size="sm" disabled>
            <ChevronRightIcon size={16} />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="gap-1.5 max-[479px]:h-8"
                disabled
              >
                <span>
                  <span className="min-[480px]:hidden" aria-hidden="true">
                    {view.charAt(0).toUpperCase()}
                  </span>
                  <span className="max-[479px]:sr-only">
                    {view.charAt(0).toUpperCase() + view.slice(1)}
                  </span>
                </span>
                <ChevronDownIcon
                  className="-me-1 opacity-60"
                  size={16}
                  aria-hidden="true"
                />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-32">
              <DropdownMenuItem disabled>
                Month <DropdownMenuShortcut>M</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem disabled>
                Week <DropdownMenuShortcut>W</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem disabled>
                Day <DropdownMenuShortcut>D</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem disabled>
                Agenda <DropdownMenuShortcut>A</DropdownMenuShortcut>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            className="max-[479px]:aspect-square max-[479px]:p-0!"
            size="sm"
            disabled
          >
            <PlusIcon
              className="opacity-60 sm:-ms-1"
              size={16}
              aria-hidden="true"
            />
            <span className="max-sm:sr-only">New event</span>
          </Button>
        </div>
      </div>

      <div className="flex flex-1 flex-col min-h-0 p-4 pt-0!">
        {view === "month" && (
          <MonthViewSkeleton
            weeks={weeks}
            weekdays={weekdays}
            currentDate={currentDate}
          />
        )}
        {view === "week" && <WeekViewSkeleton />}
      </div>
    </div>
  );
}

function MonthViewSkeleton({
  weeks,
  weekdays,
  currentDate,
}: {
  weeks: Date[][];
  weekdays: string[];
  currentDate: Date;
}) {
  return (
    <div data-slot="month-view" className="contents">
      {/* Day Headers */}
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

      {/* Calendar Grid */}
      <div className="grid flex-1 auto-rows-fr min-h-0">
        {weeks.map((week, weekIndex) => (
          <div
            key={`skeleton-week-${weekIndex}`}
            className="grid grid-cols-7 [&:last-child>*]:border-b-0"
          >
            {week.map((day, _dayIndex) => {
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isDayToday = isToday(day);

              return (
                <div
                  key={`skeleton-day-${day.toString()}`}
                  className="group border-border/70 data-outside-cell:bg-muted/25 data-outside-cell:text-muted-foreground/70 border-r border-b last:border-r-0 p-2 min-h-24"
                  data-today={isDayToday || undefined}
                  data-outside-cell={!isCurrentMonth || undefined}
                >
                  {/* Date Number */}
                  <div
                    className={`text-sm font-medium mb-2 ${
                      isCurrentMonth
                        ? "text-foreground"
                        : "text-muted-foreground"
                    } ${isDayToday ? "text-primary font-bold" : ""}`}
                  >
                    {format(day, "d")}
                  </div>

                  {/* Skeleton Events */}
                  <div className="space-y-1">
                    {Math.random() > 0.7 && (
                      <Skeleton className="h-[var(--event-height)] w-full rounded" />
                    )}
                    {Math.random() > 0.8 && (
                      <Skeleton className="h-[var(--event-height)] w-3/4 rounded" />
                    )}
                    {Math.random() > 0.9 && (
                      <Skeleton className="h-[var(--event-height)] w-1/2 rounded" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function WeekViewSkeleton() {
  const weekDays = Array.from({ length: 7 }, (_, i) =>
    addDays(startOfWeek(new Date()), i),
  );

  return (
    <div className="flex flex-col h-full">
      {/* Week Header */}
      <div className="grid grid-cols-8 border-b border-border/70">
        <div className="border-r border-border/70 p-2">
          <Skeleton className="h-4 w-8" />
        </div>
        {weekDays.map((_day, index) => (
          <div
            key={index}
            className="border-r border-border/70 last:border-r-0 p-2 text-center"
          >
            <Skeleton className="h-4 w-12 mx-auto" />
          </div>
        ))}
      </div>

      {/* Week Grid */}
      <div className="flex-1 grid grid-cols-8">
        <div className="border-r border-border/70 space-y-4 p-2">
          {Array.from({ length: 12 }, (_, i) => (
            <Skeleton key={i} className="h-4 w-8" />
          ))}
        </div>
        {weekDays.map((_, dayIndex) => (
          <div
            key={dayIndex}
            className="border-r border-border/70 last:border-r-0 p-1 space-y-2"
          >
            {Array.from(
              { length: Math.floor(Math.random() * 3) + 1 },
              (_, eventIndex) => (
                <Skeleton key={eventIndex} className="h-16 w-full rounded" />
              ),
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
