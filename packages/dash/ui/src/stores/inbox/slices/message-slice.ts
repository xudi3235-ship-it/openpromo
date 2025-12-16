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

    // Handle messages with empty ID (WebSocket messages)
    // These need special handling: match optimistic messages FIRST, then handle externalId matching
    if (!message.id) {
      // If no ID, must have externalId to match
      if (!message.externalId) {
        console.warn(
          "[Inbox] Skipping message with no ID and no externalId",
          message,
        );
        continue;
      }

      // For messages from self, FIRST check for optimistic matches
      // This must happen before externalId matching to replace optimistic messages
      if (message.sender === "self" && !message.metadata?.optimistic) {
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

          // Match by text content and timestamp
          const existingText = existing.text?.trim() ?? "";
          const incomingText = message.text?.trim() ?? "";
          const textMatches =
            (existingText === "" && incomingText === "") ||
            (existingText !== "" &&
              incomingText !== "" &&
              existingText === incomingText);

          // Also match by attachments count
          const existingAttachments = existing.attachments?.length ?? 0;
          const incomingAttachments = message.attachments?.length ?? 0;
          const attachmentsMatch = existingAttachments === incomingAttachments;

          // Match if text matches OR (both have no text and attachments match)
          if (
            !textMatches &&
            !(existingText === "" && incomingText === "" && attachmentsMatch)
          ) {
            continue;
          }

          const delta = Math.abs(
            existing.createdAt.getTime() - message.createdAt.getTime(),
          );
          if (Number.isFinite(delta) && delta <= OPTIMISTIC_WINDOW_MS) {
            optimisticIds.push(existingId);
            console.log("[Inbox] Matched optimistic message (empty ID)", {
              optimisticId: existingId,
              realExternalId: message.externalId,
              textMatches,
              attachmentsMatch,
              delta,
            });
          }
        }

        // If matched optimistic message, replace it with real message (generate ID)
        if (optimisticIds.length > 0) {
          console.log(
            "[Inbox] Replacing optimistic message with real message (empty ID)",
            {
              count: optimisticIds.length,
              ids: optimisticIds,
              realExternalId: message.externalId,
            },
          );
          // Remove optimistic messages
          for (const id of optimisticIds) {
            delete thread.itemsById[id];
          }
          // Generate ID for the real message and add it
          const realId = `real-${message.externalId}-${Date.now()}`;
          thread.itemsById[realId] = { ...message, id: realId };
          continue;
        }
      }

      // Try to match by externalId - this handles reaction updates and other metadata updates
      let matchedById: string | null = null;
      let matchedMessage: InboxMessage | null = null;
      for (const [existingId, existingRaw] of Object.entries(
        thread.itemsById,
      )) {
        const existing = normalizeMessage(existingRaw);
        // Skip optimistic messages (they should be matched above)
        const existingMeta = existing.metadata as {
          optimistic?: unknown;
        } | null;
        const existingIsOptimistic = Boolean(
          existingMeta &&
            typeof existingMeta === "object" &&
            existingMeta.optimistic,
        );
        if (existingIsOptimistic) continue;

        if (existing.externalId === message.externalId && existing.externalId) {
          // Found match by externalId - update existing message
          // IMPORTANT: For reaction updates, preserve the original createdAt timestamp
          // Only update metadata and other fields, don't replace the entire message
          matchedById = existingId;
          matchedMessage = existing;
          break;
        }
      }

      if (matchedById && matchedMessage) {
        // Update existing message: merge metadata, preserve original createdAt
        // This is important for reaction updates - they should update the message in place
        // without changing its position in the list
        const updatedMessage: InboxMessage = {
          ...matchedMessage,
          // Update metadata (reactions, etc.)
          metadata: message.metadata,
          // Preserve original createdAt to maintain message position
          createdAt: matchedMessage.createdAt,
          // Update other fields that might have changed
          text: message.text ?? matchedMessage.text,
          attachments: message.attachments ?? matchedMessage.attachments,
          // Update sender if changed (shouldn't happen, but be safe)
          sender: message.sender,
        };
        thread.itemsById[matchedById] = updatedMessage;
        console.log(
          "[Inbox] Updated existing message by externalId (empty ID)",
          {
            existingId: matchedById,
            externalId: message.externalId,
            preservedCreatedAt: matchedMessage.createdAt.toISOString(),
            hasReactions: Boolean(message.metadata?.byPlatform),
          },
        );
        continue; // Already matched and updated
      }

      // No match found - generate a temporary ID for WebSocket messages
      // This will be replaced when API message arrives with real ID
      const tempId = `temp-${message.externalId}-${Date.now()}`;
      thread.itemsById[tempId] = { ...message, id: tempId };
      continue;
    }

    // 1. Check if this exact message ID already exists (perfect match)
    const existsById = thread.itemsById[message.id];
    if (existsById) {
      // Update the existing message instead of duplicating
      thread.itemsById[message.id] = message;
      continue;
    }

    // 2. Check for duplicate by externalId (platform message ID)
    // This handles cases where the same message comes from API and WebSocket with different internal IDs
    // IMPORTANT: Skip optimistic messages in externalId matching (they have fake externalIds)
    if (message.externalId && !message.metadata?.optimistic) {
      let duplicateByExternalId: string | null = null;
      for (const [existingId, existingRaw] of Object.entries(
        thread.itemsById,
      )) {
        const existing = normalizeMessage(existingRaw);
        // Skip optimistic messages in externalId matching (they have fake externalIds)
        const existingMeta = existing.metadata as {
          optimistic?: unknown;
        } | null;
        const existingIsOptimistic = Boolean(
          existingMeta &&
            typeof existingMeta === "object" &&
            existingMeta.optimistic,
        );
        if (existingIsOptimistic) continue;

        // Skip temporary IDs (they will be replaced by real IDs)
        if (
          existing.id?.startsWith("temp-") ||
          existing.id?.startsWith("real-")
        )
          continue;

        if (
          existing.externalId === message.externalId &&
          existing.externalId // Only check if externalId exists
        ) {
          duplicateByExternalId = existingId;
          break;
        }
      }

      if (duplicateByExternalId) {
        // Found duplicate by externalId - update existing message with new data
        // This handles cases where same message comes from API and WebSocket
        // If existing has temp/real ID, replace it; otherwise update in place
        if (
          duplicateByExternalId.startsWith("temp-") ||
          duplicateByExternalId.startsWith("real-")
        ) {
          delete thread.itemsById[duplicateByExternalId];
        }
        thread.itemsById[message.id] = message;
        continue;
      }
    }

    // 3. For messages from self with real ID, check for optimistic duplicates
    // Only match optimistic messages when receiving a REAL message (not optimistic) from self
    // This replaces the optimistic message with the real one from API
    if (message.sender === "self" && !message.metadata?.optimistic) {
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

        // Match by text content and timestamp
        const existingText = existing.text?.trim() ?? "";
        const incomingText = message.text?.trim() ?? "";
        const textMatches =
          (existingText === "" && incomingText === "") ||
          (existingText !== "" &&
            incomingText !== "" &&
            existingText === incomingText);

        // Also match by attachments count
        const existingAttachments = existing.attachments?.length ?? 0;
        const incomingAttachments = message.attachments?.length ?? 0;
        const attachmentsMatch = existingAttachments === incomingAttachments;

        // Match if text matches OR (both have no text and attachments match)
        if (
          !textMatches &&
          !(existingText === "" && incomingText === "" && attachmentsMatch)
        ) {
          continue;
        }

        const delta = Math.abs(
          existing.createdAt.getTime() - message.createdAt.getTime(),
        );
        if (Number.isFinite(delta) && delta <= OPTIMISTIC_WINDOW_MS) {
          optimisticIds.push(existingId);
          console.log("[Inbox] Matched optimistic message (real ID)", {
            optimisticId: existingId,
            realMessageId: message.id,
            realExternalId: message.externalId,
            textMatches,
            attachmentsMatch,
            delta,
          });
        }
      }

      // Remove all matching optimistic messages BEFORE adding the real message
      if (optimisticIds.length > 0) {
        console.log("[Inbox] Removing optimistic messages (real ID)", {
          count: optimisticIds.length,
          ids: optimisticIds,
          realMessageId: message.id,
        });
        for (const id of optimisticIds) {
          delete thread.itemsById[id];
        }
      }
    }

    // 4. Add the new message (only if not already added via duplicate matching)
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
        // NEVER reset on subsequent syncs - always merge to preserve WebSocket messages
        if (!state.threads[conversationId]) {
          state.threads[conversationId] = emptyThread();
        }

        const thread = state.threads[conversationId];

        // Only reset thread data on initial load
        if (isInitialLoad) {
          // Clear existing messages only on initial load
          thread.itemsById = {};
          thread.items = [];
        }

        // Always merge API messages with existing messages (including WebSocket updates)
        mergeMessages(thread, items);

        // Update pagination info
        thread.page = page;
        thread.pageSize = pageSize;
        thread.total = total;
        thread.hasMore = hasNextPage;
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
