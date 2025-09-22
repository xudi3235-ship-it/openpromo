import type {
  FBFeedPlacementSpec,
  IGFeedPlacementSpec,
} from "@core/schemas/content.sql";
import { recalculateValidation } from "../utils/validation";
import type { ComposerSlice } from "./types";

export const createAccountsSlice: ComposerSlice<{
  setSelectedAccounts: (accountIds: string[]) => void;
  setActiveAccount: (accountId: string | null) => void;
}> = (set) => ({
  setSelectedAccounts: (accountIds) =>
    set((state) => {
      state.selectedAccounts = accountIds;

      if (state.activeAccount && !accountIds.includes(state.activeAccount)) {
        state.activeAccount = null;
      }

      if (!state.contentCreateData.placements.facebookFeed) {
        state.contentCreateData.placements.facebookFeed = [];
      }
      if (!state.contentCreateData.placements.instagramFeed) {
        state.contentCreateData.placements.instagramFeed = [];
      }

      state.contentCreateData.placements.facebookFeed =
        state.contentCreateData.placements.facebookFeed.filter((spec) =>
          accountIds.includes(spec.identity.connectedAccountID),
        );

      state.contentCreateData.placements.instagramFeed =
        state.contentCreateData.placements.instagramFeed.filter((spec) =>
          accountIds.includes(spec.identity.connectedAccountID),
        );

      const currentFacebookIds = new Set(
        state.contentCreateData.placements.facebookFeed.map(
          (spec) => spec.identity.connectedAccountID,
        ),
      );
      const currentInstagramIds = new Set(
        state.contentCreateData.placements.instagramFeed.map(
          (spec) => spec.identity.connectedAccountID,
        ),
      );

      accountIds.forEach((accountId) => {
        const account = state.accounts.find((acc) => acc.id === accountId);
        if (!account) return;

        if (
          account.platform === "FACEBOOK" &&
          !currentFacebookIds.has(accountId)
        ) {
          const newFacebookSpec: FBFeedPlacementSpec = {
            identity: {
              connectedAccountID: account.id,
              fbPageID: (account.metadata as { pageID: string }).pageID,
            },
            placement: "FB_FEED" as const,
            attachments: [...(state.contentCreateData.base.attachments || [])],
            postSpec: {
              message: state.contentCreateData.base.message || "",
            },
            customized: false,
          };
          state.contentCreateData.placements.facebookFeed?.push(
            newFacebookSpec,
          );
        }

        if (
          account.platform === "INSTAGRAM" &&
          !currentInstagramIds.has(accountId)
        ) {
          const newInstagramSpec: IGFeedPlacementSpec = {
            identity: {
              connectedAccountID: account.id,
              igAccountID: (account.metadata as { igAccountID: string })
                .igAccountID,
            },
            placement: "IG_FEED" as const,
            caption: state.contentCreateData.base.message || "",
            attachments: [...(state.contentCreateData.base.attachments || [])],
            customized: false,
          };
          state.contentCreateData.placements.instagramFeed?.push(
            newInstagramSpec,
          );
        }
      });

      recalculateValidation(state);
    }),
  setActiveAccount: (accountId) =>
    set((state) => {
      state.activeAccount = accountId;
    }),
});
