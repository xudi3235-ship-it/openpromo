import type { Platform } from "@core/schemas/connected-account.sql";
import type { ComposerSlice } from "./types";

export const createSelectionSlice: ComposerSlice<{
  setSelectedPreview: (platform: Platform) => void;
}> = (set) => ({
  setSelectedPreview: (platform) =>
    set((state) => {
      state.selectedPreview = platform;
    }),
});
