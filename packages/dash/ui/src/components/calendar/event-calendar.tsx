"use client";

import { Button } from "@openpromo/ui/components/button";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@openpromo/ui/components/toggle-group";
import { cn } from "@openpromo/ui/lib/utils";
import type { MergedContentEntity } from "@worker/routes/api/workspaces/content";
import {
  addMonths,
  addWeeks,
  endOfWeek,
  format,
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
  DynamicWeekView,
  EventDialog,
  EventGap,
  EventHeight,
  MonthView,
  WeekCellsHeight,
} from "@/components/calendar";
import { Route as CalendarRoute } from "@/routes/_authenticated/workspaces/$workspaceSlug/calendar";
import { useDialogComposerStore } from "@/stores/dialog-composer-store";
import ComposerDialog from "../composer/modal/dialog-composer";

export interface EventCalendarProps {
  events: MergedContentEntity[];
  onEventAdd?: (event: MergedContentEntity) => void;
  onEventUpdate?: (event: MergedContentEntity) => void;
  onEventDelete?: (eventId: string) => void;
  className?: string;
  initialView?: CalendarView;
}

export function ContentCalendar({
  events = [],
  onEventAdd,
  onEventUpdate,
  onEventDelete,
  className,
}: EventCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const { isOpen, openDialog, closeDialog } = useDialogComposerStore();
  const [selectedEvent, setSelectedEvent] =
    useState<MergedContentEntity | null>(null);

  const { view } = CalendarRoute.useSearch();
  const navigate = CalendarRoute.useNavigate();

  const setView = useCallback(
    (newView: CalendarView) => {
      if (view === newView) return;
      navigate({ search: { view: newView } });
    },
    [navigate, view],
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
    if (view === "month") {
      setCurrentDate(subMonths(currentDate, 1));
    } else if (view === "week") {
      setCurrentDate(subWeeks(currentDate, 1));
    }
  };

  const handleNext = () => {
    if (view === "month") {
      setCurrentDate(addMonths(currentDate, 1));
    } else if (view === "week") {
      setCurrentDate(addWeeks(currentDate, 1));
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

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

    const newEvent = {
      type: "content" as const,
      entity: {
        id: "",
        sourceContentId: null,
        placement: "FB_FEED" as const,
        placementSpec: null,
        publishingStatus: "DRAFT" as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    } as MergedContentEntity;
    setSelectedEvent(newEvent);
    openDialog();
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
    closeDialog();
    setSelectedEvent(null);
  };

  const handleEventDelete = (eventId: string) => {
    const deletedEvent = events.find((e) => String(e.entity?.id) === eventId);
    onEventDelete?.(eventId);
    closeDialog();
    setSelectedEvent(null);

    // Show toast notification when an event is deleted
    if (deletedEvent) {
      toast(`Content deleted`, {
        description: format(new Date(), "MMM d, yyyy"),
        position: "bottom-left",
      });
    }
  };

  const handleEventUpdate = (updatedEvent: MergedContentEntity) => {
    onEventUpdate?.(updatedEvent);

    // Show toast notification when an event is updated via drag and drop
    toast(`Content moved`, {
      description: format(new Date(), "MMM d, yyyy"),
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
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-1 sm:gap-4">
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
                className="px-3 py-1 text-xs"
              >
                <Calendar className="w-4 h-4 mr-1" />
                Week
              </ToggleGroupItem>
              <ToggleGroupItem
                value="month"
                aria-label="Month view"
                className="px-3 py-1 text-xs"
              >
                <CalendarCheck className="w-4 h-4 mr-1" />
                Month
              </ToggleGroupItem>
            </ToggleGroup>

            <Button
              variant="outline"
              className="max-[479px]:aspect-square max-[479px]:p-0!"
              onClick={handleToday}
            >
              <CalendarCheck className="min-[480px]:hidden" size={16} />
              <span className="max-[479px]:sr-only">Today</span>
            </Button>
            <div className="flex items-center sm:gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={handlePrevious}
                aria-label="Previous"
              >
                <ChevronLeftIcon size={16} aria-hidden="true" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleNext}
                aria-label="Next"
              >
                <ChevronRightIcon size={16} aria-hidden="true" />
              </Button>
            </div>
            <h2 className="text-sm font-semibold sm:text-lg md:text-xl">
              {viewTitle}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <Button
              className="max-[479px]:aspect-square max-[479px]:p-0!"
              size="sm"
              onClick={() => {
                setSelectedEvent(null); // Ensure we're creating a new event
                openDialog();
              }}
            >
              <PlusIcon
                className="opacity-60 sm:-ms-1"
                size={16}
                aria-hidden="true"
              />
              <span className="max-sm:sr-only">Create Post</span>
            </Button>
          </div>
        </div>

        <div className="flex flex-1 flex-col min-h-0 p-4 pt-0!">
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

        <EventDialog
          event={selectedEvent}
          isOpen={false}
          onClose={() => {
            closeDialog();
            setSelectedEvent(null);
          }}
          onSave={handleEventSave}
          onDelete={handleEventDelete}
        />
        <ComposerDialog />
      </CalendarDndProvider>
    </div>
  );
}
