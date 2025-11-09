import type {
  FBFeedPlacementSpec,
  IGFeedPlacementSpec,
  TikTokBusinessOptions,
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

export const createPlatformFeaturesSlice: ComposerSlice<{
  setFacebookCTA: (type: string, link: string) => void;
  removeFacebookCTA: () => void;
  updateTikTokBusinessOptions: (
    updates: Partial<TikTokBusinessOptions>,
  ) => void;
  setFirstComment: (comment: string | undefined) => void;
  removeFirstComment: () => void;
}> = (set, _get) => {
  const applyFirstCommentUpdate = (
    state: Draft<ComposerStore>,
    value: string | undefined,
  ) => {
    const trimmed = value?.trim();
    const nextValue = trimmed && trimmed.length > 0 ? trimmed : undefined;

    if (!state.activeAccount) {
      state.contentCreateData.base.firstComment = nextValue;
      syncToNonCustomizedPlacements(state, {
        facebook: (spec) => {
          spec.firstComment = nextValue;
        },
        instagram: (spec) => {
          spec.firstComment = nextValue;
        },
        tiktok: (spec) => {
          spec.firstComment = nextValue;
        },
      });
      rebuildPlacementsFromRegistry(state);
      recalculateValidation(state);
      return;
    }

    const entry = updatePlacementEntry(
      state,
      state.activeAccount,
      (current) => {
        if (current.platform === "FACEBOOK") {
          (current.spec as FBFeedPlacementSpec).firstComment = nextValue;
        } else if (current.platform === "INSTAGRAM") {
          (current.spec as IGFeedPlacementSpec).firstComment = nextValue;
        } else if (current.platform === "TIKTOK") {
          (current.spec as TikTokFeedPlacementSpec).firstComment = nextValue;
        }
      },
      { markCustomized: true },
    );

    if (!entry) return;
    rebuildPlacementsFromRegistry(state);
    recalculateValidation(state);
  };

  return {
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

    updateTikTokBusinessOptions: (updates) =>
      set((state: Draft<ComposerStore>) => {
        const applyUpdates = (spec: TikTokFeedPlacementSpec) => {
          spec.businessOptions = {
            ...(spec.businessOptions ?? {}),
            ...updates,
          };

          const options = spec.businessOptions as TikTokBusinessOptions;
          (Object.keys(options) as Array<keyof TikTokBusinessOptions>).forEach(
            (key) => {
              if (options[key] === undefined) {
                delete options[key];
              }
            },
          );

          if (Object.keys(options).length === 0) {
            spec.businessOptions = undefined;
          }
        };

        if (!state.activeAccount) {
          syncToNonCustomizedPlacements(state, {
            tiktok: (spec) => {
              applyUpdates(spec);
            },
          });
          rebuildPlacementsFromRegistry(state);
          recalculateValidation(state);
          return;
        }

        const entry = updatePlacementEntry(
          state,
          state.activeAccount,
          (current) => {
            if (current.platform === "TIKTOK") {
              applyUpdates(current.spec as TikTokFeedPlacementSpec);
            }
          },
          { markCustomized: true },
        );

        if (!entry) return;
        rebuildPlacementsFromRegistry(state);
        recalculateValidation(state);
      }),
    setFirstComment: (comment) =>
      set((state: Draft<ComposerStore>) => {
        applyFirstCommentUpdate(state, comment);
      }),
    removeFirstComment: () =>
      set((state: Draft<ComposerStore>) => {
        applyFirstCommentUpdate(state, undefined);
      }),
  };
};
