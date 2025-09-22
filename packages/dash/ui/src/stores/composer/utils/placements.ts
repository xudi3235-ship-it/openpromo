import type { Draft } from "immer";
import type { ComposerStore, PlacementSpecUpdater } from "../types";

export const syncToNonCustomizedPlacements = (
  state: Draft<ComposerStore>,
  updateFn: PlacementSpecUpdater,
) => {
  if (updateFn.facebook) {
    state.contentCreateData.placements.facebookFeed?.forEach((spec) => {
      if (!spec.customized) {
        updateFn.facebook?.(spec);
      }
    });
  }

  if (updateFn.instagram) {
    state.contentCreateData.placements.instagramFeed?.forEach((spec) => {
      if (!spec.customized) {
        updateFn.instagram?.(spec);
      }
    });
  }
};
