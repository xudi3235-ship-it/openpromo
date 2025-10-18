import { produce } from "immer";
import type { StateCreator } from "zustand";
import type {
  InboxMessage,
  InboxMessagesActions,
  InboxMessagesState,
  InboxStore,
} from "../types";

const emptyThread = (): InboxMessagesState["threads"][string] => ({
  items: [],
  itemsById: {},
  page: 1,
  pageSize: 50,
  total: 0,
  isFetching: false,
  hasMore: false,
});

export const messagesInitialState: InboxMessagesState = {
  currentConversationId: null,
  threads: {},
};

function mergeMessages(
  thread: InboxMessagesState["threads"][string],
  items: InboxMessage[],
) {
  for (const message of items) {
    thread.itemsById[message.id] = message;
  }

  const merged = Object.values(thread.itemsById).sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
  );
  thread.items = merged;
}

export const createMessagesSlice: StateCreator<
  InboxStore,
  [["zustand/immer", never]],
  [],
  InboxMessagesState & InboxMessagesActions
> = (set) => ({
  ...messagesInitialState,

  initializeThread: (conversationId) =>
    set((state) => {
      if (!state.threads[conversationId]) {
        state.threads[conversationId] = emptyThread();
      }
    }),

  setMessages: ({
    conversationId,
    items,
    page,
    pageSize,
    total,
    reset = false,
  }) =>
    set(
      produce((state: InboxMessagesState) => {
        if (!state.threads[conversationId] || reset) {
          state.threads[conversationId] = emptyThread();
        }

        const thread = state.threads[conversationId];
        thread.page = page;
        thread.pageSize = pageSize;
        thread.total = total;
        mergeMessages(thread, items);
      }),
    ),

  appendMessages: ({ conversationId, items }) =>
    set(
      produce((state: InboxMessagesState) => {
        if (!state.threads[conversationId]) {
          state.threads[conversationId] = emptyThread();
        }
        const thread = state.threads[conversationId];
        mergeMessages(thread, items);
      }),
    ),

  updateMessage: ({ conversationId, messageId, patch }) =>
    set(
      produce((state: InboxMessagesState) => {
        const thread = state.threads[conversationId];
        if (!thread) return;
        const existing = thread.itemsById[messageId];
        if (!existing) return;

        const updated = { ...existing, ...patch };
        thread.itemsById[messageId] = updated;
        mergeMessages(thread, [updated]);
      }),
    ),

  setThreadFetching: (conversationId, isFetching) =>
    set((state) => {
      const thread = state.threads[conversationId];
      if (thread) {
        thread.isFetching = isFetching;
      }
    }),

  setThreadHasMore: (conversationId, hasMore) =>
    set((state) => {
      const thread = state.threads[conversationId];
      if (thread) {
        thread.hasMore = hasMore;
      }
    }),
});
