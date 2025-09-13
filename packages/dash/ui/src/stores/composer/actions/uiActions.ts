import type { Platform } from "@core/schemas/connected-account.sql";
import type { StateCreator } from "zustand";
import type { ComposerActions, ComposerState } from "../types";

export const createUIActions: StateCreator<
  ComposerState & ComposerActions,
  [["zustand/immer", never]],
  [],
  Pick<ComposerActions, "setSelectedPreview">
> = (set) => ({
  setSelectedPreview: (preview: Platform) =>
    set((state) => {
      state.selectedPreview = preview;
    }),
});
