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

const OPTIMISTIC_WINDOW_MS = 60_000;

function normalizeMessage(message: InboxMessage): InboxMessage {
  return {
    ...message,
    attachments: message.attachments ?? [],
    metadata: message.metadata ?? {},
    createdAt:
      message.createdAt instanceof Date
        ? message.createdAt
        : new Date(message.createdAt),
  };
}

function mergeMessages(
  thread: InboxMessagesState["threads"][string],
  items: InboxMessage[],
) {
  for (const incoming of items) {
    const message = normalizeMessage(incoming);

    // Check if this exact message ID already exists (perfect match)
    const existsById = thread.itemsById[message.id];
    if (existsById) {
      // Update the existing message instead of duplicating
      thread.itemsById[message.id] = message;
      continue;
    }

    // For messages from self, check for optimistic duplicates
    if (message.sender === "self") {
      const optimisticIds: string[] = [];

      for (const [existingId, existingRaw] of Object.entries(
        thread.itemsById,
      )) {
        const existing = normalizeMessage(existingRaw);
        const metadata = existing.metadata as { optimistic?: unknown } | null;
        const existingIsOptimistic = Boolean(
          metadata && typeof metadata === "object" && metadata.optimistic,
        );
        if (!existingIsOptimistic) continue;
        if (existing.sender !== "self") continue;
        if (existing.text !== message.text) continue;

        const delta = Math.abs(
          existing.createdAt.getTime() - message.createdAt.getTime(),
        );
        if (Number.isFinite(delta) && delta <= OPTIMISTIC_WINDOW_MS) {
          optimisticIds.push(existingId);
        }
      }

      // Remove all matching optimistic messages
      for (const id of optimisticIds) {
        delete thread.itemsById[id];
      }
    }

    // Add the new message
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

  syncMessagesFromQuery: ({
    conversationId,
    items,
    page,
    pageSize,
    total,
    hasNextPage,
    isInitialLoad,
  }) =>
    set(
      produce((state: InboxMessagesState) => {
        // Only reset on initial load to preserve websocket updates
        if (!state.threads[conversationId] || isInitialLoad) {
          state.threads[conversationId] = emptyThread();
        }

        const thread = state.threads[conversationId];
        thread.page = page;
        thread.pageSize = pageSize;
        thread.total = total;
        thread.hasMore = hasNextPage;
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

  appendMessagesFromWebSocket: ({ conversationId, items }) =>
    set(
      produce((state: InboxMessagesState) => {
        // Ensure thread is initialized before appending
        if (!state.threads[conversationId]) {
          state.threads[conversationId] = emptyThread();
        }
        const thread = state.threads[conversationId];
        mergeMessages(thread, items);
      }),
    ),

  removeMessage: ({ conversationId, messageId }) =>
    set(
      produce((state: InboxMessagesState) => {
        const thread = state.threads[conversationId];
        if (!thread) return;
        delete thread.itemsById[messageId];
        thread.items = thread.items.filter((msg) => msg.id !== messageId);
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
