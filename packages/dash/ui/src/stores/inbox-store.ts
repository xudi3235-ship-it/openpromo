import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import {
  conversationsInitialPagination,
  conversationsInitialState,
  createConversationsSlice,
} from "./inbox/slices/conversation-slice";
import {
  createFiltersSlice,
  filtersInitialState,
} from "./inbox/slices/filters-slice";
import {
  createMessagesSlice,
  messagesInitialState,
} from "./inbox/slices/message-slice";
import {
  createRealtimeSlice,
  realtimeInitialState,
} from "./inbox/slices/realtime-slice";
import { createUISlice, uiInitialState } from "./inbox/slices/ui-slice";
import type { InboxStore } from "./inbox/types";

export const useInboxStore = create<InboxStore>()(
  immer((set, get, store) => ({
    ...createFiltersSlice(set, get, store),
    ...createConversationsSlice(set, get, store),
    ...createMessagesSlice(set, get, store),
    ...createUISlice(set, get, store),
    ...createRealtimeSlice(set, get, store),

    initialize: (workspaceSlug: string) => {
      set((state) => {
        Object.assign(state, {
          ...filtersInitialState,
          workspaceSlug,
          ...conversationsInitialState,
          pagination: { ...conversationsInitialPagination },
          ...messagesInitialState,
          ...uiInitialState,
          ...realtimeInitialState,
        });
      });
    },

    reset: () => {
      const currentWorkspace = get().workspaceSlug;
      set((state) => {
        Object.assign(state, {
          ...filtersInitialState,
          workspaceSlug: currentWorkspace,
          ...conversationsInitialState,
          pagination: { ...conversationsInitialPagination },
          ...messagesInitialState,
          ...uiInitialState,
          ...realtimeInitialState,
        });
      });
    },
  })),
);
