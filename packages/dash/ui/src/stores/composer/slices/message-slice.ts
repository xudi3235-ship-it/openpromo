import { syncToNonCustomizedPlacements } from "../utils/placements";
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

    const activeAccount = state.accounts.find(
      (acc) => acc.id === state.activeAccount,
    );
    if (!activeAccount) {
      return state.contentCreateData.base.message || "";
    }

    if (activeAccount.platform === "FACEBOOK") {
      const spec = state.contentCreateData.placements.facebookFeed?.find(
        (placement) =>
          placement.identity.connectedAccountID === state.activeAccount,
      );
      return spec?.postSpec.message || "";
    }

    if (activeAccount.platform === "INSTAGRAM") {
      const spec = state.contentCreateData.placements.instagramFeed?.find(
        (placement) =>
          placement.identity.connectedAccountID === state.activeAccount,
      );
      return spec?.caption || "";
    }

    if (activeAccount.platform === "TIKTOK") {
      const spec = state.contentCreateData.placements.tiktokFeed?.find(
        (placement) =>
          placement.identity.connectedAccountID === state.activeAccount,
      );
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
        return;
      }

      const activeAccount = state.accounts.find(
        (acc) => acc.id === state.activeAccount,
      );
      if (!activeAccount) return;

      if (activeAccount.platform === "FACEBOOK") {
        const spec = state.contentCreateData.placements.facebookFeed?.find(
          (placement) =>
            placement.identity.connectedAccountID === state.activeAccount,
        );
        if (spec) {
          spec.postSpec.message = message;
          spec.customized = true;
        }
      }

      if (activeAccount.platform === "INSTAGRAM") {
        const spec = state.contentCreateData.placements.instagramFeed?.find(
          (placement) =>
            placement.identity.connectedAccountID === state.activeAccount,
        );
        if (spec) {
          spec.caption = message;
          spec.customized = true;
        }
      }

      if (activeAccount.platform === "TIKTOK") {
        const spec = state.contentCreateData.placements.tiktokFeed?.find(
          (placement) =>
            placement.identity.connectedAccountID === state.activeAccount,
        );
        if (spec) {
          spec.caption = message;
          spec.customized = true;
        }
      }

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
    }),
});
