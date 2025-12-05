import {
  type AllPlatforms,
  AllPlatformsZod,
  type ContentPublishingStatus,
  ContentPublishingStatusZod,
} from "@shared";
import { createFileRoute } from "@tanstack/react-router";
import type { MergedContentEntity } from "@worker/shared/content-types";
import { format, parse } from "date-fns";
import { useState } from "react";
import * as z from "zod";
import { CalendarSkeleton, EventCalendar } from "@/components/calendar";
import { CalendarViews } from "@/components/calendar/types";
import {
  getCalendarDateRange,
  useCalendarDateRange,
} from "@/hooks/calendar/useCalendarDateRange";
import {
  prefetchContentList,
  useContentListQuery,
} from "@/queries/content-orpc";

const calendarSearchSchema = z.object({
  view: z.enum(CalendarViews).catch("week"),
  date: z.string().optional(), // YYYY-MM-DD format
  platform: AllPlatformsZod.optional(),
  publishingStatus: ContentPublishingStatusZod.optional(), // DRAFT, SCHEDULED, PUBLISHED
});

export const Route = createFileRoute(
  "/_authenticated/workspaces/$workspaceSlug/calendar",
)({
  validateSearch: calendarSearchSchema,
  loaderDeps: ({ search }) => ({
    view: search.view,
    date: search.date,
    platform: search.platform,
    publishingStatus: search.publishingStatus,
  }),
  loader: async ({ params, context, deps }) => {
    // Parse the date from URL or use today
    const currentDate = deps.date
      ? parse(deps.date, "yyyy-MM-dd", new Date())
      : new Date();

    // Calculate date range from current date and view
    const { fromDate, toDate } = getCalendarDateRange(currentDate, deps.view);

    // Prefetch content list for calendar
    prefetchContentList(context.queryClient, params.workspaceSlug, {
      page: 1,
      pageSize: 100,
      sortBy: "createdAt",
      sortOrder: "desc",
      fromDate,
      toDate,
      platform: deps.platform,
      publishingStatus: deps.publishingStatus,
    });
  },
  component: CalendarPage,
});

export default function CalendarPage() {
  const {
    view,
    date: dateParam,
    platform,
    publishingStatus,
  } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());

  // Use date from URL if provided, otherwise use internal state
  const pageDate = dateParam
    ? parse(dateParam, "yyyy-MM-dd", new Date())
    : currentDate;
  const { fromDate, toDate } = useCalendarDateRange(pageDate, view);

  const { data, isPending } = useContentListQuery({
    page: 1,
    pageSize: 500,
    sortBy: "createdAt",
    sortOrder: "desc",
    fromDate,
    toDate,
    platform,
    publishingStatus,
  });

  const [events, setEvents] = useState<MergedContentEntity[]>([]);

  const handleEventAdd = (event: MergedContentEntity) => {
    setEvents([...events, event]);
  };

  const handleEventUpdate = (
    updatedEvent: MergedContentEntity,
    _context?: { proposedPublishAt?: Date },
  ) => {
    setEvents(
      events.map((event) =>
        event.entity.id === updatedEvent.entity.id ? updatedEvent : event,
      ),
    );
  };

  const handleEventDelete = (eventId: string) => {
    setEvents(events.filter((event) => String(event.entity.id) !== eventId));
  };

  const handleDateChange = (newDate: Date) => {
    setCurrentDate(newDate);
    // Format date as YYYY-MM-DD for URL
    const formattedDate = format(newDate, "yyyy-MM-dd");
    navigate({
      search: {
        view,
        date: formattedDate,
        platform,
        publishingStatus,
      },
    });
  };

  const handleFiltersChange = (filters: {
    platform?: AllPlatforms;
    publishingStatus?: ContentPublishingStatus;
  }) => {
    navigate({
      search: {
        view,
        date: dateParam,
        platform: filters.platform,
        publishingStatus: filters.publishingStatus,
      },
    });
  };

  if (isPending) {
    return <CalendarSkeleton />;
  }

  return (
    <EventCalendar
      events={data?.entities as unknown as MergedContentEntity[]}
      onEventAdd={handleEventAdd}
      onEventUpdate={handleEventUpdate}
      onEventDelete={handleEventDelete}
      currentDate={pageDate}
      onDateChange={handleDateChange}
      filters={{ platform, publishingStatus }}
      onFiltersChange={handleFiltersChange}
    />
  );
}
