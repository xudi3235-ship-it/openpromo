import type { MergedContentEntity } from "@worker/shared/content-types";
import { create } from "zustand";

export interface CalendarReschedulePayload {
  event: MergedContentEntity;
  proposedPublishAt: Date;
  groupId?: string;
}

interface CalendarRescheduleStore {
  state: CalendarReschedulePayload | null;
  open: (payload: CalendarReschedulePayload) => void;
  close: () => void;
}

export const useCalendarRescheduleStore = create<CalendarRescheduleStore>(
  (set) => ({
    state: null,
    open: (payload) => set({ state: payload }),
    close: () => set({ state: null }),
  }),
);
