import type {
  FBFeedPlacementSpec,
  IGFeedPlacementSpec,
  TikTokFeedPlacementSpec,
} from "@shared/content";
import {
  getPlacementEntry,
  rebuildPlacementsFromRegistry,
  syncToNonCustomizedPlacements,
  updatePlacementEntry,
} from "../utils/placements";
import { recalculateValidation } from "../utils/validation";
import type { ComposerSlice } from "./types";

export const createMessageSlice: ComposerSlice<{
  getCurrentMessage: () => string;
  setCurrentMessage: (message: string) => void;
  setMessage: (message: string) => void;
}> = (set, get) => ({
  getCurrentMessage: () => {
    const state = get();
    if (!state.activeAccount) {
      return state.contentCreateData.base.message || "";
    }

    const entry = getPlacementEntry(state, state.activeAccount);
    if (!entry) {
      return state.contentCreateData.base.message || "";
    }

    if (entry.platform === "FACEBOOK") {
      const spec = entry.spec as FBFeedPlacementSpec;
      return spec?.postSpec.message || "";
    }

    if (entry.platform === "INSTAGRAM") {
      const spec = entry.spec as IGFeedPlacementSpec;
      return spec?.caption || "";
    }

    if (entry.platform === "TIKTOK") {
      const spec = entry.spec as TikTokFeedPlacementSpec;
      return spec?.caption || "";
    }

    return state.contentCreateData.base.message || "";
  },
  setCurrentMessage: (message) =>
    set((state) => {
      if (!state.activeAccount) {
        state.contentCreateData.base.message = message;
        syncToNonCustomizedPlacements(state, {
          facebook: (spec) => {
            spec.postSpec.message = message;
          },
          instagram: (spec) => {
            spec.caption = message;
          },
          tiktok: (spec) => {
            spec.caption = message;
          },
        });
        recalculateValidation(state);
        rebuildPlacementsFromRegistry(state);
        return;
      }

      const entry = updatePlacementEntry(
        state,
        state.activeAccount,
        (current) => {
          if (current.platform === "FACEBOOK") {
            (current.spec as FBFeedPlacementSpec).postSpec.message = message;
          } else if (current.platform === "INSTAGRAM") {
            (current.spec as IGFeedPlacementSpec).caption = message;
          } else if (current.platform === "TIKTOK") {
            (current.spec as TikTokFeedPlacementSpec).caption = message;
          }
        },
        { markCustomized: true },
      );
      if (!entry) return;
      rebuildPlacementsFromRegistry(state);
      recalculateValidation(state);
    }),
  setMessage: (message) =>
    set((state) => {
      state.contentCreateData.base.message = message;
      syncToNonCustomizedPlacements(state, {
        facebook: (spec) => {
          spec.postSpec.message = message;
        },
        instagram: (spec) => {
          spec.caption = message;
        },
        tiktok: (spec) => {
          spec.caption = message;
        },
      });
      recalculateValidation(state);
      rebuildPlacementsFromRegistry(state);
    }),
});
