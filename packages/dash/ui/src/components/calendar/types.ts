import type { MergedContentEntity } from "@worker/routes/api/workspaces/content";

export type CalendarView = "month" | "week";

export const CalendarViews = ["month", "week"] as const;

export type CalendarEvent = MergedContentEntity;

export type EventColor =
  | "sky"
  | "amber"
  | "violet"
  | "rose"
  | "emerald"
  | "orange";
