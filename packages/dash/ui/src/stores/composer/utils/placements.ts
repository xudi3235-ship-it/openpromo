import type {
  FBFeedPlacementSpec,
  IGFeedPlacementSpec,
  TikTokFeedPlacementSpec,
} from "@shared/content";
import type { ContentCreateData } from "@worker/routes/api/workspaces/content";
import type { Draft } from "immer";
import type { ConnectedAccount } from "@/lib/hono-client";
import type {
  ComposerStore,
  PlacementRegistryEntry,
  PlacementSpecUpdater,
} from "../types";

export const syncToNonCustomizedPlacements = (
  state: Draft<ComposerStore>,
  updateFn: PlacementSpecUpdater,
) => {
  if (!state.placementsByAccount) {
    state.placementsByAccount = {};
  }

  Object.values(state.placementsByAccount).forEach((entry) => {
    if (entry.customized) return;

    if (entry.platform === "FACEBOOK" && updateFn.facebook) {
      const spec = entry.spec as FBFeedPlacementSpec;
      updateFn.facebook(spec);
      spec.customized = false;
      entry.customized = false;
    } else if (entry.platform === "INSTAGRAM" && updateFn.instagram) {
      const spec = entry.spec as IGFeedPlacementSpec;
      updateFn.instagram(spec);
      spec.customized = false;
      entry.customized = false;
    } else if (entry.platform === "TIKTOK" && updateFn.tiktok) {
      const spec = entry.spec as TikTokFeedPlacementSpec;
      updateFn.tiktok(spec);
      spec.customized = false;
      entry.customized = false;
    }
  });

  rebuildPlacementsFromRegistry(state);
};

export const buildPlacementRegistry = (
  accounts: ConnectedAccount[],
  placements: ComposerStore["contentCreateData"]["placements"],
): Record<string, PlacementRegistryEntry> => {
  const registry: Record<string, PlacementRegistryEntry> = {};
  const accountsById = new Map(
    accounts.map((account) => [account.id, account]),
  );

  placements.facebookFeed?.forEach((spec) => {
    const accountId = spec.identity.connectedAccountID;
    const account = accountsById.get(accountId);
    if (!account) return;
    registry[accountId] = {
      accountId,
      platform: account.platform,
      enabled: true,
      customized: Boolean(spec.customized),
      spec,
    };
  });

  placements.instagramFeed?.forEach((spec) => {
    const accountId = spec.identity.connectedAccountID;
    const account = accountsById.get(accountId);
    if (!account) return;
    registry[accountId] = {
      accountId,
      platform: account.platform,
      enabled: true,
      customized: Boolean(spec.customized),
      spec,
    };
  });

  placements.tiktokFeed?.forEach((spec) => {
    const accountId = spec.identity.connectedAccountID;
    const account = accountsById.get(accountId);
    if (!account) return;
    registry[accountId] = {
      accountId,
      platform: account.platform,
      enabled: true,
      customized: Boolean(spec.customized),
      spec,
    };
  });

  return registry;
};

const getSchedulingSpecForNewPlacement = (
  state: Draft<ComposerStore>,
): ContentCreateData["base"]["schedulingSpec"] | undefined => {
  if (state.contentCreateData.base.publishingStatus !== "SCHEDULED") {
    return undefined;
  }
  const publishAt = state.contentCreateData.base.schedulingSpec?.publishAt;
  if (!publishAt) return undefined;
  return {
    publishAt: new Date(publishAt),
  };
};

export const createDefaultSpecForAccount = (
  state: Draft<ComposerStore>,
  account: ConnectedAccount,
):
  | FBFeedPlacementSpec
  | IGFeedPlacementSpec
  | TikTokFeedPlacementSpec
  | null => {
  const baseAttachments = [...(state.contentCreateData.base.attachments ?? [])];
  const baseMessage = state.contentCreateData.base.message || "";
  const schedulingSpec = getSchedulingSpecForNewPlacement(state);

  if (account.platform === "FACEBOOK") {
    const spec: FBFeedPlacementSpec = {
      identity: {
        connectedAccountID: account.id,
        fbPageID: (account.metadata as { pageID: string }).pageID,
      },
      placement: "FB_FEED",
      attachments: [...baseAttachments],
      postSpec: {
        message: baseMessage,
      },
      customized: false,
    };
    if (schedulingSpec) {
      spec.schedulingSpec = schedulingSpec;
    }
    return spec;
  }

  if (account.platform === "INSTAGRAM") {
    const spec: IGFeedPlacementSpec = {
      identity: {
        connectedAccountID: account.id,
        igAccountID: (account.metadata as { igAccountID: string }).igAccountID,
      },
      placement: "IG_FEED",
      caption: baseMessage,
      attachments: [...baseAttachments],
      customized: false,
    };
    if (schedulingSpec) {
      spec.schedulingSpec = schedulingSpec;
    }
    return spec;
  }

  if (account.platform === "TIKTOK") {
    const spec: TikTokFeedPlacementSpec = {
      identity: {
        connectedAccountID: account.id,
        tiktokUserID: (account.metadata as { tiktokUserId: string })
          .tiktokUserId,
      },
      placement: "TT_FEED",
      caption: baseMessage,
      attachments: [...baseAttachments],
      customized: false,
    };
    if (schedulingSpec) {
      spec.schedulingSpec = schedulingSpec;
    }
    return spec;
  }

  return null;
};

export const ensurePlacementRegistryEntry = (
  state: Draft<ComposerStore>,
  account: ConnectedAccount,
): PlacementRegistryEntry | undefined => {
  if (!state.placementsByAccount) {
    state.placementsByAccount = {};
  }

  const existing = state.placementsByAccount[account.id];
  if (existing) {
    existing.platform = account.platform;
    if (!existing.spec) {
      const spec = createDefaultSpecForAccount(state, account);
      if (spec) {
        existing.spec = spec;
        existing.customized = Boolean(spec.customized);
      }
    }
    return existing;
  }

  const spec = createDefaultSpecForAccount(state, account);
  if (!spec) return undefined;

  const entry: PlacementRegistryEntry = {
    accountId: account.id,
    platform: account.platform,
    enabled: false,
    customized: Boolean(spec.customized),
    spec,
  };

  state.placementsByAccount[account.id] = entry;
  return entry;
};

export const syncSelectedAccountsFromRegistry = (
  state: Draft<ComposerStore>,
) => {
  if (!state.placementsByAccount) {
    state.selectedAccounts = [];
    return;
  }

  const registry = state.placementsByAccount;
  state.selectedAccounts = state.accounts
    .filter((account) => registry[account.id]?.enabled)
    .map((account) => account.id);
};

export const rebuildPlacementsFromRegistry = (state: Draft<ComposerStore>) => {
  if (!state.placementsByAccount) {
    state.placementsByAccount = {};
  }

  const placements = state.contentCreateData.placements;
  placements.facebookFeed = [];
  placements.instagramFeed = [];
  placements.tiktokFeed = [];

  state.accounts.forEach((account) => {
    const entry = state.placementsByAccount[account.id];
    if (!entry) return;

    entry.customized = Boolean(
      (entry.spec as { customized?: boolean }).customized,
    );

    if (!entry.enabled) {
      return;
    }

    if (entry.platform === "FACEBOOK") {
      placements.facebookFeed?.push(entry.spec as FBFeedPlacementSpec);
    } else if (entry.platform === "INSTAGRAM") {
      placements.instagramFeed?.push(entry.spec as IGFeedPlacementSpec);
    } else if (entry.platform === "TIKTOK") {
      placements.tiktokFeed?.push(entry.spec as TikTokFeedPlacementSpec);
    }
  });
};

export const getPlacementEntry = (
  state: Draft<ComposerStore>,
  accountId: string,
): PlacementRegistryEntry | undefined => {
  return state.placementsByAccount?.[accountId];
};

export const updatePlacementEntry = (
  state: Draft<ComposerStore>,
  accountId: string,
  updater: (entry: PlacementRegistryEntry) => void,
  options?: { markCustomized?: boolean },
): PlacementRegistryEntry | undefined => {
  const entry = getPlacementEntry(state, accountId);
  if (!entry) return undefined;
  updater(entry);
  if (options?.markCustomized) {
    entry.customized = true;
    const spec = entry.spec as { customized?: boolean };
    if ("customized" in spec) {
      spec.customized = true;
    }
  }
  return entry;
};

export const resetPlacementEntryToBase = (
  state: Draft<ComposerStore>,
  accountId: string,
): PlacementRegistryEntry | undefined => {
  if (!state.placementsByAccount) {
    state.placementsByAccount = {};
  }

  const account = state.accounts.find((acc) => acc.id === accountId);
  if (!account) return undefined;

  const defaultSpec = createDefaultSpecForAccount(state, account);
  if (!defaultSpec) return undefined;

  const entry = ensurePlacementRegistryEntry(state, account);
  if (!entry) return undefined;

  const wasEnabled = entry.enabled;
  entry.spec = defaultSpec;
  entry.platform = account.platform;
  entry.enabled = wasEnabled;
  entry.customized = false;
  return entry;
};
