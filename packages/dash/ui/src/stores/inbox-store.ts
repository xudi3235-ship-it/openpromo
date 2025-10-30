import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import {
  conversationsInitialPagination,
  conversationsInitialState,
  createConversationsSlice,
} from "./inbox/slices/conversation-slice";
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
  immer((set, get, _store) => ({
    ...createConversationsSlice(set, get, _store),
    ...createMessagesSlice(set, get, _store),
    ...createUISlice(set, get, _store),
    ...createRealtimeSlice(set, get, _store),

    initialize: (_workspaceSlug: string) => {
      set((state) => {
        Object.assign(state, {
          ...conversationsInitialState,
          pagination: { ...conversationsInitialPagination },
          ...messagesInitialState,
          ...uiInitialState,
          ...realtimeInitialState,
        });
      });
    },

    reset: () => {
      set((state) => {
        Object.assign(state, {
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
