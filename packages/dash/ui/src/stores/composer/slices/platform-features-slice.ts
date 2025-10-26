import type { FBFeedPlacementSpec } from "@shared/content";
import type { Draft } from "immer";
import type { ComposerStore } from "../types";
import {
  rebuildPlacementsFromRegistry,
  syncToNonCustomizedPlacements,
  updatePlacementEntry,
} from "../utils/placements";
import { recalculateValidation } from "../utils/validation";
import type { ComposerSlice } from "./types";

export const createPlatformFeaturesSlice: ComposerSlice<{
  setFacebookCTA: (type: string, link: string) => void;
  removeFacebookCTA: () => void;
}> = (set, _get) => ({
  setFacebookCTA: (type: string, link: string) =>
    set((state: Draft<ComposerStore>) => {
      const callToAction: NonNullable<
        FBFeedPlacementSpec["postSpec"]["callToAction"]
      > = {
        type: type as NonNullable<
          FBFeedPlacementSpec["postSpec"]["callToAction"]
        >["type"],
        value: { link },
      };

      if (!state.activeAccount) {
        // Base mode - update all non-customized Facebook placements
        syncToNonCustomizedPlacements(state, {
          facebook: (spec) => {
            spec.postSpec.callToAction = callToAction;
          },
        });
        rebuildPlacementsFromRegistry(state);
        recalculateValidation(state);
        return;
      }

      // Customization mode - update specific account
      const entry = updatePlacementEntry(
        state,
        state.activeAccount,
        (current) => {
          if (current.platform === "FACEBOOK") {
            (current.spec as FBFeedPlacementSpec).postSpec.callToAction =
              callToAction;
          }
        },
        { markCustomized: true },
      );

      if (!entry) return;
      rebuildPlacementsFromRegistry(state);
      recalculateValidation(state);
    }),

  removeFacebookCTA: () =>
    set((state: Draft<ComposerStore>) => {
      if (!state.activeAccount) {
        // Base mode - remove from all non-customized Facebook placements
        syncToNonCustomizedPlacements(state, {
          facebook: (spec) => {
            spec.postSpec.callToAction = undefined;
          },
        });
        rebuildPlacementsFromRegistry(state);
        recalculateValidation(state);
        return;
      }

      // Customization mode - remove from specific account
      const entry = updatePlacementEntry(
        state,
        state.activeAccount,
        (current) => {
          if (current.platform === "FACEBOOK") {
            (current.spec as FBFeedPlacementSpec).postSpec.callToAction =
              undefined;
          }
        },
        { markCustomized: true },
      );

      if (!entry) return;
      rebuildPlacementsFromRegistry(state);
      recalculateValidation(state);
    }),
});
