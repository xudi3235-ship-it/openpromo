import type { StateCreator } from "zustand";
import { setMessageOverride } from "../domain/draft";
import type { ComposerActions, ComposerState } from "../types";

export const createPlacementActions: StateCreator<
  ComposerState & ComposerActions,
  [["zustand/immer", never]],
  [],
  Pick<ComposerActions, "setPlacementSpecs">
> = (set) => ({
  setPlacementSpecs: (specs) =>
    set((state) => {
      if (specs.base?.message !== undefined)
        state.draft.message = specs.base.message;
      if (specs.base?.attachments !== undefined)
        state.draft.attachments = specs.base.attachments.map((a) => ({ ...a }));
      // Hydrate selected account ids from provided placement specs (union of both)
      const ids = new Set<string>();
      specs.facebookFeed?.forEach((s) => {
        ids.add(s.identity.connectedAccountID);
      });
      specs.instagramFeed?.forEach((s) => {
        ids.add(s.identity.connectedAccountID);
      });
      if (ids.size > 0) state.draft.selectedAccountIds = Array.from(ids);
      // Hydrate overrides by comparing with base message
      const baseMsg = state.draft.message;
      specs.facebookFeed?.forEach((s) => {
        if (s.postSpec.message && s.postSpec.message !== baseMsg)
          setMessageOverride(
            state.draft,
            "FB_FEED",
            s.identity.connectedAccountID,
            s.postSpec.message,
          );
      });
      specs.instagramFeed?.forEach((s) => {
        if (s.caption && s.caption !== baseMsg)
          setMessageOverride(
            state.draft,
            "IG_FEED",
            s.identity.connectedAccountID,
            s.caption,
          );
      });
      state.draftVersion++;
    }),
});
