import type {
  FBFeedPlacementSpec,
  IGFeedPlacementSpec,
} from "@core/domain/content/schema/placement";
import type {
  FBPageMetadata,
  IGAccountMetadata,
} from "@core/schemas/connected-account.sql";
import type { StateCreator } from "zustand";
import type { ConnectedAccount } from "@/lib/hono-client";
import { buildFBSpec, buildIGSpec } from "../helpers";
import type { ComposerActions, ComposerState } from "../types";

export const createAccountActions: StateCreator<
  ComposerState & ComposerActions,
  [["zustand/immer", never]],
  [],
  Pick<ComposerActions, "toggleAccount" | "toggleAllAccounts" | "setAccounts">
> = (set, get) => ({
  toggleAccount: (accountId) =>
    set((state) => {
      const account = state.accountsMap.get(accountId);
      if (!account) return;
      const selectedAccounts = get()._getSelectedAccounts();
      const base = state.contentCreateData.base;

      if (selectedAccounts.includes(accountId)) {
        if (account.platform === "FACEBOOK") {
          state.contentCreateData.placements.facebookFeed =
            state.contentCreateData.placements.facebookFeed?.filter(
              (spec) => spec.identity.connectedAccountID !== accountId,
            );
        } else if (account.platform === "INSTAGRAM") {
          state.contentCreateData.placements.instagramFeed =
            state.contentCreateData.placements.instagramFeed?.filter(
              (spec) => spec.identity.connectedAccountID !== accountId,
            );
        }
      } else {
        if (account.platform === "FACEBOOK") {
          const fbSpec = buildFBSpec(
            account,
            base.message || "",
            base.attachments,
          );
          if (!state.contentCreateData.placements.facebookFeed) {
            state.contentCreateData.placements.facebookFeed = [];
          }
          state.contentCreateData.placements.facebookFeed.push(fbSpec);
        } else if (account.platform === "INSTAGRAM") {
          const igSpec = buildIGSpec(
            account,
            base.message || "",
            base.attachments,
          );
          if (!state.contentCreateData.placements.instagramFeed) {
            state.contentCreateData.placements.instagramFeed = [];
          }
          state.contentCreateData.placements.instagramFeed.push(igSpec);
        }
      }
    }),
  toggleAllAccounts: () =>
    set((state) => {
      const allAccounts = Array.from(state.accountsMap.values());
      const selectedAccounts = get()._getSelectedAccounts();
      const base = state.contentCreateData.base;

      if (selectedAccounts.length === allAccounts.length) {
        state.contentCreateData.placements.facebookFeed = [];
        state.contentCreateData.placements.instagramFeed = [];
      } else {
        state.contentCreateData.placements.facebookFeed = allAccounts
          .filter((a) => a.platform === "FACEBOOK")
          .map(
            (acc) =>
              ({
                identity: {
                  connectedAccountID: acc.id,
                  fbPageID: (acc.metadata as FBPageMetadata).pageID,
                },
                placement: "FB_FEED",
                postSpec: {
                  message: base.message || "",
                  attachments: base.attachments.map((a) => ({ ...a })),
                },
              }) as FBFeedPlacementSpec,
          );
        state.contentCreateData.placements.instagramFeed = allAccounts
          .filter((a) => a.platform === "INSTAGRAM")
          .map(
            (acc) =>
              ({
                identity: {
                  connectedAccountID: acc.id,
                  igAccountID: (acc.metadata as IGAccountMetadata).igAccountID,
                },
                placement: "IG_FEED",
                caption: base.message || "",
                attachments: base.attachments.map((a) => ({ ...a })),
              }) as IGFeedPlacementSpec,
          );
      }
    }),
  setAccounts: (accounts: ConnectedAccount[]) =>
    set((state) => {
      state.accountsMap = new Map(accounts.map((a) => [a.id, a]));
      const base = state.contentCreateData.base;
      state.contentCreateData.placements.facebookFeed = accounts
        .filter((a) => a.platform === "FACEBOOK")
        .map((a) => buildFBSpec(a, base.message || "", base.attachments));
      state.contentCreateData.placements.instagramFeed = accounts
        .filter((a) => a.platform === "INSTAGRAM")
        .map((a) => buildIGSpec(a, base.message || "", base.attachments));
    }),
});
