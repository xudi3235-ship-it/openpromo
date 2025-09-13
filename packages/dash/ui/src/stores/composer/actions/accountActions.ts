import type { StateCreator } from "zustand";
import type { ConnectedAccount } from "@/lib/hono-client";
import type { ComposerActions, ComposerState } from "../types";

export const createAccountActions: StateCreator<
  ComposerState & ComposerActions,
  [["zustand/immer", never]],
  [],
  Pick<ComposerActions, "toggleAccount" | "toggleAllAccounts" | "setAccounts">
> = (set) => ({
  toggleAccount: (accountId) =>
    set((state) => {
      const idx = state.draft.selectedAccountIds.indexOf(accountId);
      if (idx >= 0) state.draft.selectedAccountIds.splice(idx, 1);
      else state.draft.selectedAccountIds.push(accountId);
      state.draftVersion++;
    }),
  toggleAllAccounts: () =>
    set((state) => {
      const allIds = Array.from(state.accountsMap.keys());
      const allSelected =
        state.draft.selectedAccountIds.length === allIds.length &&
        allIds.length > 0;
      state.draft.selectedAccountIds = allSelected ? [] : allIds;
      state.draftVersion++;
    }),
  setAccounts: (accounts: ConnectedAccount[]) =>
    set((state) => {
      state.accountsMap = new Map(accounts.map((a) => [a.id, a]));
      // prune selected ids not present anymore
      state.draft.selectedAccountIds = state.draft.selectedAccountIds.filter(
        (id) => state.accountsMap.has(id),
      );
      state.draftVersion++;
    }),
});
