import type {
  FBFeedPlacementSpec,
  IGFeedPlacementSpec,
  TikTokFeedPlacementSpec,
} from "@shared/content";
import type { Draft } from "immer";
import type { ComposerStore } from "../types";
import {
  rebuildPlacementsFromRegistry,
  syncToNonCustomizedPlacements,
  updatePlacementEntry,
} from "../utils/placements";
import { recalculateValidation } from "../utils/validation";
import type { ComposerSlice } from "./types";

export const createVideoThumbnailSlice: ComposerSlice<{
  setVideoThumbnail: (url: string | undefined) => void;
}> = (set, _get) => ({
  setVideoThumbnail: (url: string | undefined) =>
    set((state: Draft<ComposerStore>) => {
      state.contentCreateData.base.thumbnailUrl = url ?? undefined;

      const applyThumbnail = (spec: { thumbnailUrl?: string }) => {
        spec.thumbnailUrl = url ?? undefined;
      };

      const applyTikTokThumbnail = (spec: TikTokFeedPlacementSpec) => {
        applyThumbnail(spec);
        if (url) {
          spec.businessOptions = spec.businessOptions ?? {};
          spec.businessOptions.customThumbnailUrl = url;
        } else if (spec.businessOptions) {
          delete spec.businessOptions.customThumbnailUrl;
          if (Object.keys(spec.businessOptions).length === 0) {
            spec.businessOptions = undefined;
          }
        }
      };

      const applyFacebookThumbnail = (spec: FBFeedPlacementSpec) => {
        applyThumbnail(spec);
      };

      const applyInstagramThumbnail = (spec: IGFeedPlacementSpec) => {
        applyThumbnail(spec);
      };

      syncToNonCustomizedPlacements(state, {
        facebook: applyFacebookThumbnail,
        instagram: applyInstagramThumbnail,
        tiktok: applyTikTokThumbnail,
      });

      if (state.activeAccount) {
        updatePlacementEntry(
          state,
          state.activeAccount,
          (current) => {
            if (current.platform === "FACEBOOK") {
              applyFacebookThumbnail(current.spec as FBFeedPlacementSpec);
            } else if (current.platform === "INSTAGRAM") {
              applyInstagramThumbnail(current.spec as IGFeedPlacementSpec);
            } else if (current.platform === "TIKTOK") {
              applyTikTokThumbnail(current.spec as TikTokFeedPlacementSpec);
            }
          },
          { markCustomized: true },
        );
      }

      rebuildPlacementsFromRegistry(state);
      recalculateValidation(state);
    }),
});
