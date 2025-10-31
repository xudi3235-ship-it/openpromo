"use client";

import { Button } from "@openpromo/ui/components/button";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@openpromo/ui/components/toggle-group";
import { cn } from "@openpromo/ui/lib/utils";
import type {
  ContentCreateData,
  MergedContentEntity,
} from "@worker/routes/api/workspaces/content";
import {
  addMonths,
  addWeeks,
  endOfWeek,
  format,
  isToday,
  startOfWeek,
  subMonths,
  subWeeks,
} from "date-fns";
import {
  Calendar,
  CalendarCheck,
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  CalendarDndProvider,
  type CalendarView,
  createPlaceholderContentEvent,
  DynamicWeekView,
  EventDialog,
  EventGap,
  EventHeight,
  MonthView,
  WeekCellsHeight,
} from "@/components/calendar";
import { ContentFilters } from "@/components/content/content-filters";
import { useCalendarDragUpdate } from "@/hooks/calendar/useCalendarDragUpdate";
import { Route as CalendarRoute } from "@/routes/_authenticated/workspaces/$workspaceSlug/calendar";
import { useDialogComposerStore } from "@/stores/dialog-composer-store";
import { CalendarRescheduleDialog } from "./reschedule-dialog";

export interface EventCalendarProps {
  events: MergedContentEntity[];
  onEventAdd?: (event: MergedContentEntity) => void;
  onEventUpdate?: (
    event: MergedContentEntity,
    context?: { proposedPublishAt?: Date },
  ) => void;
  onEventDelete?: (eventId: string) => void;
  className?: string;
  initialView?: CalendarView;
  currentDate?: Date;
  onDateChange?: (date: Date) => void;
  onViewChange?: (view: CalendarView) => void;
  filters?: { platform?: string; publishingStatus?: string };
  onFiltersChange?: (filters: {
    platform?: string;
    publishingStatus?: string;
  }) => void;
}

export function ContentCalendar({
  events = [],
  onEventAdd,
  onEventUpdate,
  onEventDelete,
  className,
  currentDate: externalCurrentDate,
  onDateChange,
  onViewChange,
  filters = {},
  onFiltersChange,
}: EventCalendarProps) {
  const [internalCurrentDate, setInternalCurrentDate] = useState(new Date());
  const currentDate = externalCurrentDate ?? internalCurrentDate;

  const { mode, openDialog, closeComposer } = useDialogComposerStore();
  const isOpen = mode !== "closed";
  const [selectedEvent, setSelectedEvent] =
    useState<MergedContentEntity | null>(null);

  const { view } = CalendarRoute.useSearch();
  const navigate = CalendarRoute.useNavigate();

  const setView = useCallback(
    (newView: CalendarView) => {
      if (view === newView) return;
      navigate({ search: { view: newView } });
      onViewChange?.(newView);
    },
    [navigate, view, onViewChange],
  );

  // Add keyboard shortcuts for view switching
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if user is typing in an input, textarea or contentEditable element
      // or if the event dialog is open
      if (
        isOpen ||
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target instanceof HTMLElement && e.target.isContentEditable)
      ) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case "m":
          setView("month");
          break;
        case "w":
          setView("week");
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, setView]);

  const handlePrevious = () => {
    const newDate =
      view === "month" ? subMonths(currentDate, 1) : subWeeks(currentDate, 1);
    if (onDateChange) {
      onDateChange(newDate);
    } else {
      setInternalCurrentDate(newDate);
    }
  };

  const handleNext = () => {
    const newDate =
      view === "month" ? addMonths(currentDate, 1) : addWeeks(currentDate, 1);
    if (onDateChange) {
      onDateChange(newDate);
    } else {
      setInternalCurrentDate(newDate);
    }
  };

  const handleToday = () => {
    const newDate = new Date();
    if (onDateChange) {
      onDateChange(newDate);
    } else {
      setInternalCurrentDate(newDate);
    }
  };

  const buildInitialContentCreateData = useCallback(
    (publishAt?: Date): ContentCreateData => {
      const base: ContentCreateData["base"] = {
        message: "",
        publishingStatus: publishAt ? "SCHEDULED" : "PUBLISH_NOW",
        attachments: [],
        schedulingSpec: publishAt ? { publishAt } : undefined,
      };

      return {
        base,
        placements: {
          facebookFeed: [],
          instagramFeed: [],
          tiktokFeed: [],
        },
      };
    },
    [],
  );

  const handleEventSelect = (event: MergedContentEntity) => {
    setSelectedEvent(event);
    // TODO:
    openDialog(event.entity?.id);
  };

  const handleEventCreate = (startTime: Date) => {
    // Snap to 15-minute intervals
    const minutes = startTime.getMinutes();
    const remainder = minutes % 15;
    if (remainder !== 0) {
      if (remainder < 7.5) {
        // Round down to nearest 15 min
        startTime.setMinutes(minutes - remainder);
      } else {
        // Round up to nearest 15 min
        startTime.setMinutes(minutes + (15 - remainder));
      }
      startTime.setSeconds(0);
      startTime.setMilliseconds(0);
    }

    const newEvent = createPlaceholderContentEvent(
      new Date(startTime),
      "SCHEDULED",
    );
    setSelectedEvent(newEvent);
    const publishAt = (() => {
      if (!isToday(startTime)) return new Date(startTime);
      const now = new Date();
      const thirtyMinutesFromNow = new Date(now.getTime() + 30 * 60 * 1000);
      return startTime >= thirtyMinutesFromNow
        ? new Date(startTime)
        : undefined;
    })();

    const initialContentData = buildInitialContentCreateData(publishAt);
    openDialog(undefined, { contentCreateData: initialContentData });
  };

  const handleEventSave = (event: MergedContentEntity) => {
    if (event.entity?.id) {
      onEventUpdate?.(event);
      // Show toast notification when an event is updated
      toast(`Content updated`, {
        description: format(new Date(), "MMM d, yyyy"),
        position: "bottom-left",
      });
    } else {
      const eventWithId = {
        ...event,
        entity: {
          ...event.entity,
          id: Math.random().toString(36).substring(2, 11),
        },
      } as MergedContentEntity;
      onEventAdd?.(eventWithId);
      // Show toast notification when an event is added
      toast(`Content added`, {
        description: format(new Date(), "MMM d, yyyy"),
        position: "bottom-left",
      });
    }
    closeComposer();
    setSelectedEvent(null);
  };

  const handleEventDelete = (eventId: string) => {
    const deletedEvent = events.find((e) => String(e.entity?.id) === eventId);
    onEventDelete?.(eventId);
    closeComposer();
    setSelectedEvent(null);

    // Show toast notification when an event is deleted
    if (deletedEvent) {
      toast(`Content deleted`, {
        description: format(new Date(), "MMM d, yyyy"),
        position: "bottom-left",
      });
    }
  };

  const {
    handleEventUpdate,
    rescheduleState,
    closeRescheduleDialog,
    openComposerForReschedule,
  } = useCalendarDragUpdate({ onEventUpdate });

  const handleRescheduleConfirm = (publishAt: Date) => {
    closeRescheduleDialog();
    toast("Reschedule pending", {
      description: format(publishAt, "MMM d, yyyy • h:mma"),
      position: "bottom-left",
    });
  };

  const viewTitle = useMemo(() => {
    if (view === "month") {
      return format(currentDate, "MMMM yyyy");
    } else if (view === "week") {
      const start = startOfWeek(currentDate, { weekStartsOn: 0 });
      const end = endOfWeek(currentDate, { weekStartsOn: 0 });
      return `${format(start, "MMM d")} - ${format(end, "MMM d, yyyy")}`;
    } else {
      return format(currentDate, "MMMM yyyy");
    }
  }, [currentDate, view]);

  return (
    <div
      className={cn("h-full w-full flex flex-col", className)}
      style={
        {
          "--event-height": `${EventHeight}px`,
          "--event-gap": `${EventGap}px`,
          "--week-cells-height": `${WeekCellsHeight}px`,
        } as React.CSSProperties
      }
    >
      <CalendarDndProvider onEventUpdate={handleEventUpdate}>
        <header className="px-4 pt-4 pb-3 flex-shrink-0">
          <div className="flex flex-col gap-0.5">
            <h1 className="text-lg font-semibold text-foreground">Calendar</h1>
            <p className="text-xs text-muted-foreground">
              Plan upcoming content across your social accounts.
            </p>
          </div>
        </header>

        {/* Controls and Filters Row */}
        <div className="px-4 py-3 border-b border-border/50 flex-shrink-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-0.5 sm:gap-2 flex-wrap">
              {/* View Toggle - Week/Month */}
              <ToggleGroup
                type="single"
                value={view}
                onValueChange={(value) => {
                  if (value && (value === "week" || value === "month")) {
                    setView(value);
                  }
                }}
                className="border rounded-md"
              >
                <ToggleGroupItem
                  value="week"
                  aria-label="Week view"
                  className="px-2 py-1 text-xs"
                >
                  <Calendar className="w-3.5 h-3.5 mr-1" />
                  Week
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="month"
                  aria-label="Month view"
                  className="px-2 py-1 text-xs"
                >
                  <CalendarCheck className="w-3.5 h-3.5 mr-1" />
                  Month
                </ToggleGroupItem>
              </ToggleGroup>

              <Button
                variant="outline"
                size="sm"
                className="max-[479px]:aspect-square max-[479px]:p-0!"
                onClick={handleToday}
              >
                <CalendarCheck className="min-[480px]:hidden" size={14} />
                <span className="max-[479px]:sr-only text-xs">Today</span>
              </Button>
              <div className="flex items-center gap-0.5">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handlePrevious}
                  aria-label="Previous"
                >
                  <ChevronLeftIcon size={14} aria-hidden="true" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleNext}
                  aria-label="Next"
                >
                  <ChevronRightIcon size={14} aria-hidden="true" />
                </Button>
              </div>
              <h2 className="text-sm font-semibold sm:text-base md:text-lg truncate">
                {viewTitle}
              </h2>

              {/* Separator */}
              <div className="h-6 w-px bg-border/50 mx-1 hidden sm:block" />

              {/* Filters - inline */}
              <ContentFilters
                filters={{
                  platform: filters?.platform,
                  publishingStatus: filters?.publishingStatus,
                }}
                onFiltersChange={(newFilters) => {
                  onFiltersChange?.(newFilters);
                }}
                showDateFilter={false}
              />
            </div>
            <div className="flex items-center gap-1">
              <Button
                className="max-[479px]:aspect-square max-[479px]:p-0!"
                size="sm"
                onClick={() => {
                  setSelectedEvent(null); // Ensure we're creating a new event
                  openDialog();
                }}
              >
                <PlusIcon
                  className="opacity-60 sm:-ms-0.5"
                  size={14}
                  aria-hidden="true"
                />
                <span className="max-sm:sr-only text-xs">Create Post</span>
              </Button>
            </div>
          </div>
        </div>

        <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
          <div className="flex-1 p-3 pt-0! overflow-auto">
            {view === "month" && (
              <MonthView
                currentDate={currentDate}
                events={events}
                onEventSelect={handleEventSelect}
                onEventCreate={handleEventCreate}
              />
            )}
            {view === "week" && (
              <DynamicWeekView
                currentDate={currentDate}
                events={events}
                onEventSelect={handleEventSelect}
                onEventCreate={handleEventCreate}
                onEventDelete={handleEventDelete}
              />
            )}
          </div>
        </div>

        <EventDialog
          event={selectedEvent}
          isOpen={false}
          onClose={() => {
            closeComposer();
            setSelectedEvent(null);
          }}
          onSave={handleEventSave}
          onDelete={handleEventDelete}
        />
        <CalendarRescheduleDialog
          state={rescheduleState}
          onClose={closeRescheduleDialog}
          onConfirm={handleRescheduleConfirm}
          onEditMore={openComposerForReschedule}
        />
      </CalendarDndProvider>
    </div>
  );
}
