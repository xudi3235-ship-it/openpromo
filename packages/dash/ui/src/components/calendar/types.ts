import type { MergedContentEntity } from "@worker/routes/api/workspaces/content";

export type CalendarView = "month" | "week" | "day" | "agenda";

export const CalendarViews = ["month", "week", "day", "agenda"] as const;

export type CalendarEvent = MergedContentEntity;

export type EventColor =
  | "sky"
  | "amber"
  | "violet"
  | "rose"
  | "emerald"
  | "orange";
