import type { Draft } from "immer";
import type { ComposerStore } from "../types";
import {
  ensurePlacementRegistryEntry,
  rebuildPlacementsFromRegistry,
  syncSelectedAccountsFromRegistry,
} from "../utils/placements";
import { recalculateValidation } from "../utils/validation";
import type { ComposerSlice } from "./types";

const uniqueAccountIds = (accountIds: string[]) =>
  Array.from(new Set(accountIds.filter(Boolean)));

const finalizeSelectionMutation = (state: Draft<ComposerStore>) => {
  rebuildPlacementsFromRegistry(state);
  syncSelectedAccountsFromRegistry(state);
  recalculateValidation(state);
};

const applySetEnabledAccounts = (
  state: Draft<ComposerStore>,
  accountIds: string[],
) => {
  if (!state.placementsByAccount) {
    state.placementsByAccount = {};
  }

  const nextIds = uniqueAccountIds(accountIds);
  const accountsById = new Map(
    state.accounts.map((account) => [account.id, account]),
  );

  nextIds.forEach((accountId) => {
    const account = accountsById.get(accountId);
    if (!account) return;
    const entry = ensurePlacementRegistryEntry(state, account);
    if (entry) {
      entry.enabled = true;
    }
  });

  Object.values(state.placementsByAccount).forEach((entry) => {
    entry.enabled = nextIds.includes(entry.accountId);
  });

  if (state.activeAccount && !nextIds.includes(state.activeAccount)) {
    state.activeAccount = null;
  }

  finalizeSelectionMutation(state);
};

const applyEnableAccounts = (
  state: Draft<ComposerStore>,
  accountIds: string[],
) => {
  if (!state.placementsByAccount) {
    state.placementsByAccount = {};
  }

  const accountsById = new Map(
    state.accounts.map((account) => [account.id, account]),
  );

  const targets = uniqueAccountIds(accountIds);
  targets.forEach((accountId) => {
    const account = accountsById.get(accountId);
    if (!account) return;
    const entry = ensurePlacementRegistryEntry(state, account);
    if (entry) {
      entry.enabled = true;
    }
  });

  finalizeSelectionMutation(state);
};

const applyDisableAccounts = (
  state: Draft<ComposerStore>,
  accountIds: string[],
) => {
  if (!state.placementsByAccount) {
    state.placementsByAccount = {};
  }

  const targets = uniqueAccountIds(accountIds);
  let deactivatedActive = false;

  targets.forEach((accountId) => {
    const entry = state.placementsByAccount?.[accountId];
    if (entry) {
      entry.enabled = false;
    }
    if (state.activeAccount === accountId) {
      deactivatedActive = true;
    }
  });

  if (deactivatedActive) {
    state.activeAccount = null;
  }

  finalizeSelectionMutation(state);
};

export const createAccountsSlice: ComposerSlice<{
  setSelectedAccounts: (accountIds: string[]) => void;
  setActiveAccount: (accountId: string | null) => void;
  replaceSelectedAccounts: (accountIds: string[]) => void;
  addSelectedAccounts: (accountIds: string[]) => void;
  removeSelectedAccounts: (accountIds: string[]) => void;
  toggleAccountSelection: (accountId: string) => void;
}> = (set) => ({
  setSelectedAccounts: (accountIds) =>
    set((state) => {
      applySetEnabledAccounts(state, accountIds);
    }),
  replaceSelectedAccounts: (accountIds) =>
    set((state) => {
      applySetEnabledAccounts(state, accountIds);
    }),
  addSelectedAccounts: (accountIds) =>
    set((state) => {
      if (accountIds.length === 0) return;
      applyEnableAccounts(state, accountIds);
    }),
  removeSelectedAccounts: (accountIds) =>
    set((state) => {
      if (accountIds.length === 0) return;
      applyDisableAccounts(state, accountIds);
    }),
  toggleAccountSelection: (accountId) =>
    set((state) => {
      if (!accountId) return;

      const entry = state.placementsByAccount?.[accountId];
      if (entry?.enabled) {
        applyDisableAccounts(state, [accountId]);
      } else {
        const account = state.accounts.find((acc) => acc.id === accountId);
        if (!account) return;
        applyEnableAccounts(state, [accountId]);
      }
    }),
  setActiveAccount: (accountId) =>
    set((state) => {
      if (
        accountId &&
        state.placementsByAccount?.[accountId] &&
        !state.placementsByAccount[accountId].enabled
      ) {
        state.activeAccount = null;
        return;
      }
      state.activeAccount = accountId;
    }),
});
