import type { StateCreator } from "zustand";
import { setMessageOverride } from "../domain/draft";
import type { ComposerActions, ComposerState } from "../types";

export const createMessageActions: StateCreator<
  ComposerState & ComposerActions,
  [["zustand/immer", never]],
  [],
  Pick<
    ComposerActions,
    "updateBaseMessage" | "overridePlacementMessage" | "resetPlacementMessage"
  >
> = (set) => ({
  updateBaseMessage: (message: string) =>
    set((state) => {
      state.draft.message = message;
      state.draftVersion++;
    }),
  overridePlacementMessage: (placement, connectedAccountID, message) =>
    set((state) => {
      setMessageOverride(state.draft, placement, connectedAccountID, message);
      state.draftVersion++;
    }),
  resetPlacementMessage: (placement, connectedAccountID) =>
    set((state) => {
      setMessageOverride(state.draft, placement, connectedAccountID, null);
      state.draftVersion++;
    }),
});
