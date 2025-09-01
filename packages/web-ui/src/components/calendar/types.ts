export type CalendarView = "month" | "week" | "day" | "agenda";

export const CalendarViews = ["month", "week", "day", "agenda"] as const;

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  color?: EventColor;
  location?: string;
}

export type EventColor =
  | "sky"
  | "amber"
  | "violet"
  | "rose"
  | "emerald"
  | "orange";
