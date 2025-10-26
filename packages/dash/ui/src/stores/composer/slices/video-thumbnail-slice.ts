import type { Draft } from "immer";
import type { ComposerStore } from "../types";
import { recalculateValidation } from "../utils/validation";
import type { ComposerSlice } from "./types";

export const createVideoThumbnailSlice: ComposerSlice<{
  setVideoThumbnail: (url: string | undefined) => void;
}> = (set, _get) => ({
  setVideoThumbnail: (url: string | undefined) =>
    set((state: Draft<ComposerStore>) => {
      state.contentCreateData.base.thumbnailUrl = url;
      recalculateValidation(state);
    }),
});
