import type { StateCreator } from "zustand";
import type {
  InboxFiltersActions,
  InboxFiltersState,
  InboxStore,
} from "../types";

export const filtersInitialState: InboxFiltersState = {
  workspaceSlug: null,
  selectedPlatform: null,
  selectedChannel: null,
  connectedAccountId: null,
  search: "",
};

export const createFiltersSlice: StateCreator<
  InboxStore,
  [["zustand/immer", never]],
  [],
  InboxFiltersState & InboxFiltersActions
> = (set) => ({
  ...filtersInitialState,

  initializeFilters: (workspaceSlug) =>
    set((state) => {
      state.workspaceSlug = workspaceSlug;
      state.selectedPlatform = null;
      state.selectedChannel = null;
      state.connectedAccountId = null;
      state.search = "";
    }),

  setPlatform: (platform) =>
    set((state) => {
      state.selectedPlatform = platform;
    }),

  setChannel: (channel) =>
    set((state) => {
      state.selectedChannel = channel;
    }),

  setConnectedAccount: (connectedAccountId) =>
    set((state) => {
      state.connectedAccountId = connectedAccountId;
    }),

  setSearch: (search) =>
    set((state) => {
      state.search = search;
    }),

  clearFilters: () =>
    set((state) => {
      state.selectedPlatform = null;
      state.selectedChannel = null;
      state.connectedAccountId = null;
      state.search = "";
    }),
});
