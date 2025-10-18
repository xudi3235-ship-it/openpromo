import { produce } from "immer";
import type { StateCreator } from "zustand";
import type {
  InboxConversationPagination,
  InboxConversationSummary,
  InboxConversationsActions,
  InboxConversationsState,
  InboxStore,
} from "../types";

export const conversationsInitialPagination: InboxConversationPagination = {
  page: 1,
  pageSize: 25,
  total: 0,
  isFetching: false,
};

export const conversationsInitialState: InboxConversationsState = {
  byId: {},
  order: [],
  selectedConversationId: null,
  pagination: conversationsInitialPagination,
  loadingState: "idle",
};

function sortConversations(
  order: string[],
  byId: Record<string, InboxConversationSummary>,
) {
  return order.sort((a, b) => {
    const left = byId[a];
    const right = byId[b];
    if (!left || !right) return 0;
    return right.lastMessageAt.getTime() - left.lastMessageAt.getTime();
  });
}

export const createConversationsSlice: StateCreator<
  InboxStore,
  [["zustand/immer", never]],
  [],
  InboxConversationsState & InboxConversationsActions
> = (set, get) => ({
  ...conversationsInitialState,

  setConversations: ({ conversations, pagination, replace = true }) =>
    set(
      produce((state: InboxConversationsState) => {
        if (replace) {
          state.byId = {};
          state.order = [];
        }

        for (const conversation of conversations) {
          state.byId[conversation.id] = conversation;
          if (!state.order.includes(conversation.id)) {
            state.order.push(conversation.id);
          }
        }
        state.order = sortConversations(state.order, state.byId);
        state.pagination = pagination;
      }),
    ),

  upsertConversation: (conversation) =>
    set(
      produce((state: InboxConversationsState) => {
        state.byId[conversation.id] = conversation;
        if (!state.order.includes(conversation.id)) {
          state.order.push(conversation.id);
        }
        state.order = sortConversations(state.order, state.byId);
      }),
    ),

  selectConversation: (conversationId) => {
    set((state) => {
      state.selectedConversationId = conversationId;
      state.currentConversationId = conversationId;
    });
    if (conversationId) {
      get().initializeThread(conversationId);
    }
  },

  setConversationLoadingState: (loadingState) =>
    set((state) => {
      state.loadingState = loadingState;
    }),
});
