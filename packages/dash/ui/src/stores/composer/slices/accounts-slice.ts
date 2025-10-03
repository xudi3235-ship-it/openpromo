import type {
  FBFeedPlacementSpec,
  IGFeedPlacementSpec,
  TikTokFeedPlacementSpec,
} from "@shared/content";
import type { ContentCreateData } from "@worker/routes/api/workspaces/content";
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
      if (!state.contentCreateData.placements.tiktokFeed) {
        state.contentCreateData.placements.tiktokFeed = [];
      }

      state.contentCreateData.placements.facebookFeed =
        state.contentCreateData.placements.facebookFeed.filter((spec) =>
          accountIds.includes(spec.identity.connectedAccountID),
        );

      state.contentCreateData.placements.instagramFeed =
        state.contentCreateData.placements.instagramFeed.filter((spec) =>
          accountIds.includes(spec.identity.connectedAccountID),
        );

      state.contentCreateData.placements.tiktokFeed =
        state.contentCreateData.placements.tiktokFeed.filter((spec) =>
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
      const currentTikTokIds = new Set(
        state.contentCreateData.placements.tiktokFeed.map(
          (spec) => spec.identity.connectedAccountID,
        ),
      );

      const getSchedulingSpecForPlacement = () => {
        if (state.contentCreateData.base.publishingStatus !== "SCHEDULED") {
          return undefined;
        }
        const publishAt =
          state.contentCreateData.base.schedulingSpec?.publishAt;
        if (!publishAt) {
          return undefined;
        }
        return {
          publishAt: new Date(publishAt),
        } as ContentCreateData["base"]["schedulingSpec"];
      };

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
            placement: "FB_FEED",
            attachments: [...(state.contentCreateData.base.attachments || [])],
            postSpec: {
              message: state.contentCreateData.base.message || "",
            },
            customized: false,
          };
          const schedulingSpec = getSchedulingSpecForPlacement();
          if (schedulingSpec) {
            newFacebookSpec.schedulingSpec = schedulingSpec;
          }
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
            placement: "IG_FEED",
            caption: state.contentCreateData.base.message || "",
            attachments: [...(state.contentCreateData.base.attachments || [])],
            customized: false,
          };
          const schedulingSpec = getSchedulingSpecForPlacement();
          if (schedulingSpec) {
            newInstagramSpec.schedulingSpec = schedulingSpec;
          }
          state.contentCreateData.placements.instagramFeed?.push(
            newInstagramSpec,
          );
        }

        if (account.platform === "TIKTOK" && !currentTikTokIds.has(accountId)) {
          const newTikTokSpec: TikTokFeedPlacementSpec = {
            identity: {
              connectedAccountID: account.id,
              tiktokUserID: (account.metadata as { tiktokUserId: string })
                .tiktokUserId,
            },
            placement: "TT_FEED",
            caption: state.contentCreateData.base.message || "",
            attachments: [...(state.contentCreateData.base.attachments || [])],
            customized: false,
          };
          const schedulingSpec = getSchedulingSpecForPlacement();
          if (schedulingSpec) {
            newTikTokSpec.schedulingSpec = schedulingSpec;
          }
          state.contentCreateData.placements.tiktokFeed?.push(newTikTokSpec);
        }
      });

      recalculateValidation(state);
    }),
  setActiveAccount: (accountId) =>
    set((state) => {
      state.activeAccount = accountId;
    }),
});
