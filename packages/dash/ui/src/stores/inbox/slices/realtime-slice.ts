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
});
