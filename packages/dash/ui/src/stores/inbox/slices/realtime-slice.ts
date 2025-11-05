import type { StateCreator } from "zustand";
import type {
  InboxRealtimeActions,
  InboxRealtimeState,
  InboxStore,
} from "../types";

export const realtimeInitialState: InboxRealtimeState = {
  lastEventTimestamp: null,
};

export const createRealtimeSlice: StateCreator<
  InboxStore,
  [["zustand/immer", never]],
  [],
  InboxRealtimeState & InboxRealtimeActions
> = (set, get) => ({
  ...realtimeInitialState,

  applyRealtimeEvent: (event) => {
    set((state) => {
      state.lastEventTimestamp = event.timestamp;
    });

    if (event.type === "conversation.upserted") {
      const data = event.data as Parameters<
        InboxStore["upsertConversation"]
      >[0];
      get().upsertConversation(data);
    } else if (event.type === "message.upserted") {
      const data = event.data as {
        conversationId: string;
        message: Parameters<InboxStore["appendMessages"]>[0]["items"][number];
      };
      get().appendMessages({
        conversationId: data.conversationId,
        items: [data.message],
      });
    }
  },

  handleConversationUpserted: async ({
    conversationId,
    lastMessageAt,
    contact,
    isUnread,
    lastReadAt,
  }) => {
    const state = get();
    const existing = state.byId[conversationId];

    if (!existing) {
      // New conversation - we need to fetch the full details
      // This happens when a new conversation is created (e.g., new DM or comment thread)
      console.debug(
        "[Inbox] New conversation detected, will be loaded on next refresh",
        conversationId,
      );
      // Note: We could fetch it here, but that would require passing queryClient
      // through the store, which is complex. Instead, the conversation will appear
      // on the next query refresh or when the user navigates.
      // For now, we just log it. The UI will update when the query refetches.
      return;
    }

    state.upsertConversation({
      ...existing,
      lastMessageAt,
      contact,
      ...(isUnread !== undefined && { isUnread }),
      ...(lastReadAt !== undefined && { lastReadAt }),
    });
  },

  handleMessageUpserted: ({ conversationId, message }) => {
    const state = get();

    // Use the specialized method that ensures thread initialization
    state.appendMessagesFromWebSocket({
      conversationId,
      items: [message],
    });
  },
});
