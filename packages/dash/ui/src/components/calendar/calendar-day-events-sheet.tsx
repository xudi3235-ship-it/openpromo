import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@openpromo/ui/components/sheet";
import { format } from "date-fns";
import type React from "react";
import type { CalendarEvent } from "@/components/calendar";
import { getEventData } from "@/components/calendar";
import { CalendarEventCardCompact } from "./calendar-event-card-compact";

interface CalendarDayEventsSheetProps {
  day: Date;
  events: CalendarEvent[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEventClick: (event: CalendarEvent, e: React.MouseEvent) => void;
  onEventDelete?: (eventId: string) => void;
}

/**
 * Side panel sheet that shows all events for a given day
 * Used when clicking "N more" in the month view
 */
export function CalendarDayEventsSheet({
  day,
  events,
  open,
  onOpenChange,
  onEventClick,
  onEventDelete,
}: CalendarDayEventsSheetProps) {
  // Sort events by start time
  const sortedEvents = [...events].sort((a, b) => {
    const aData = getEventData(a);
    const bData = getEventData(b);
    return new Date(aData.start).getTime() - new Date(bData.start).getTime();
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-80 sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{format(day, "EEEE, MMMM d")}</SheetTitle>
          <SheetDescription>
            {events.length} {events.length === 1 ? "event" : "events"} scheduled
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <div className="space-y-2">
            {sortedEvents.map((event) => {
              const eventData = getEventData(event);
              return (
                <CalendarEventCardCompact
                  key={eventData.id}
                  event={event}
                  onClick={(e) => onEventClick(event, e)}
                  onDelete={onEventDelete}
                />
              );
            })}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
