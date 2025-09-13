import type { StateCreator } from "zustand";
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
      const oldMessage = state.contentCreateData.base.message;
      state.contentCreateData.base.message = message;
      state.contentCreateData.placements.facebookFeed?.forEach((spec) => {
        if (spec.postSpec.message === oldMessage)
          spec.postSpec.message = message;
      });
      state.contentCreateData.placements.instagramFeed?.forEach((spec) => {
        if (spec.caption == null || spec.caption === oldMessage)
          spec.caption = message;
      });
    }),
  overridePlacementMessage: (placement, connectedAccountID, message) =>
    set((state) => {
      if (placement === "FB_FEED") {
        const spec = state.contentCreateData.placements.facebookFeed?.find(
          (s) => s.identity.connectedAccountID === connectedAccountID,
        );
        if (spec) spec.postSpec.message = message;
      } else if (placement === "IG_FEED") {
        const spec = state.contentCreateData.placements.instagramFeed?.find(
          (s) => s.identity.connectedAccountID === connectedAccountID,
        );
        if (spec) spec.caption = message;
      }
    }),
  resetPlacementMessage: (placement, connectedAccountID) =>
    set((state) => {
      const baseMsg = state.contentCreateData.base.message;
      if (placement === "FB_FEED") {
        const spec = state.contentCreateData.placements.facebookFeed?.find(
          (s) => s.identity.connectedAccountID === connectedAccountID,
        );
        if (spec) spec.postSpec.message = baseMsg;
      } else if (placement === "IG_FEED") {
        const spec = state.contentCreateData.placements.instagramFeed?.find(
          (s) => s.identity.connectedAccountID === connectedAccountID,
        );
        if (spec) spec.caption = baseMsg;
      }
    }),
});
