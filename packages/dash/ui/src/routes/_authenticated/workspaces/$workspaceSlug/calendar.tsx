import { createFileRoute } from "@tanstack/react-router";
import type { MergedContentEntity } from "@worker/routes/api/workspaces/content";
import { useState } from "react";
import * as z from "zod";
import { CalendarSkeleton, EventCalendar } from "@/components/calendar";
import { CalendarViews } from "@/components/calendar/types";
import { useContentListQuery } from "@/queries/content";

const calendarSearchSchema = z.object({
  view: z.enum(CalendarViews).catch("week"),
});

export const Route = createFileRoute(
  "/_authenticated/workspaces/$workspaceSlug/calendar",
)({
  validateSearch: calendarSearchSchema,
  component: CalendarPage,
});

export default function CalendarPage() {
  const { data, isLoading } = useContentListQuery();
  const [events, setEvents] = useState<MergedContentEntity[]>([]);

  const handleEventAdd = (event: MergedContentEntity) => {
    setEvents([...events, event]);
  };

  const handleEventUpdate = (updatedEvent: MergedContentEntity) => {
    setEvents(
      events.map((event) =>
        event.entity.id === updatedEvent.entity.id ? updatedEvent : event,
      ),
    );
  };

  const handleEventDelete = (eventId: string) => {
    setEvents(events.filter((event) => String(event.entity.id) !== eventId));
  };

  if (isLoading) {
    return <CalendarSkeleton />;
  }

  return (
    <EventCalendar
      events={data?.entities as unknown as MergedContentEntity[]}
      onEventAdd={handleEventAdd}
      onEventUpdate={handleEventUpdate}
      onEventDelete={handleEventDelete}
    />
  );
}
