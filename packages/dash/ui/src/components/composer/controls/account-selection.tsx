import type { Platform } from "@core/schemas/connected-account.sql";
import { cn } from "@openpromo/ui/lib/utils";
import { useEffect, useMemo, useState } from "react";
import {
  AccountSelectionPlatformFilter,
  type PlatformFilter,
  type PlatformFilterOption,
} from "@/components/composer/controls/account-selection-platform-filter";
import { getPlatformMeta } from "@/components/composer/utils/platform-style";
import { AvailablePlatformsRow } from "@/components/connected-accounts/available-platforms-row";
import { ComposerAccountsRow } from "@/components/connected-accounts/connected-accounts-row";
import type { ConnectedAccount } from "@/lib/hono-client";
import { useOAuthWithListener } from "@/queries/connected-account";
import { useComposerStore } from "@/stores/composer-store";

const PLATFORM_ORDER: Platform[] = ["FACEBOOK", "INSTAGRAM", "TIKTOK"];

function CustomizationScopeBanner({
  account,
  onClear,
}: {
  account: ConnectedAccount;
  onClear: () => void;
}) {
  const meta = getPlatformMeta(account.platform);
  const Icon = meta.icon;
  const accountLabel = account.accountName || meta.label;

  return (
    <div
      role="note"
      className="space-y-1.5 rounded-md border border-border/60 bg-muted/20 px-3 py-2"
    >
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        {Icon && <Icon className={cn("h-4 w-4", meta.accentTextClass)} />}
        <span className="line-clamp-2" title={accountLabel}>
          {accountLabel}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        You are customizing settings just for
        <span className="font-medium text-foreground"> {accountLabel}</span>.
        Switch or stop customizing to apply changes to all selected accounts.
      </p>
      <button
        type="button"
        onClick={onClear}
        className={cn(
          "text-xs font-medium underline-offset-2 transition-colors hover:underline",
          meta.accentTextClass,
        )}
      >
        Stop customizing
      </button>
    </div>
  );
}

export function AccountSelection() {
  const {
    accounts,
    selectedAccounts,
    activeAccount,
    setActiveAccount,
    toggleAccountSelection,
    replaceSelectedAccounts,
    addSelectedAccounts,
    removeSelectedAccounts,
  } = useComposerStore();
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>("ALL");

  const canCustomize = accounts.length > 1;

  const activeAccountData = accounts.find((acc) => acc.id === activeAccount);
  const activeMeta = activeAccountData
    ? getPlatformMeta(activeAccountData.platform)
    : null;
  const ActiveIcon = activeMeta?.icon;

  const activeAccountLabel = activeAccountData
    ? activeAccountData.accountName || activeMeta?.label || ""
    : null;

  const {
    handleConnectFacebook,
    handleConnectInstagram,
    handleConnectTikTok,
    isConnecting,
  } = useOAuthWithListener();

  const platformCounts = useMemo(() => {
    return accounts.reduce(
      (acc, account) => {
        acc[account.platform] += 1;
        return acc;
      },
      {
        FACEBOOK: 0,
        INSTAGRAM: 0,
        TIKTOK: 0,
      } as Record<Platform, number>,
    );
  }, [accounts]);

  const filteredAccounts = useMemo(() => {
    if (platformFilter === "ALL") {
      return accounts;
    }
    return accounts.filter((account) => account.platform === platformFilter);
  }, [accounts, platformFilter]);

  const filteredActiveAccount = useMemo(() => {
    if (!activeAccount) return null;
    return filteredAccounts.some((account) => account.id === activeAccount)
      ? activeAccount
      : null;
  }, [activeAccount, filteredAccounts]);

  const visibleSelectedCount = useMemo(() => {
    return filteredAccounts.filter((account) =>
      selectedAccounts.includes(account.id),
    ).length;
  }, [filteredAccounts, selectedAccounts]);

  const allFilteredSelected =
    filteredAccounts.length > 0 &&
    visibleSelectedCount === filteredAccounts.length;

  const platformFilterOptions: PlatformFilterOption[] = useMemo(() => {
    return [
      {
        value: "ALL" as PlatformFilter,
        label: "All",
        count: accounts.length,
      },
      ...PLATFORM_ORDER.map((platform) => {
        const meta = getPlatformMeta(platform);
        return {
          value: platform as PlatformFilter,
          label: meta.label,
          count: platformCounts[platform],
          meta,
        };
      }),
    ];
  }, [accounts.length, platformCounts]);

  const activeFilterOption = useMemo(() => {
    return platformFilterOptions.find(
      (option) => option.value === platformFilter,
    );
  }, [platformFilterOptions, platformFilter]);

  const handleToggleAccount = (accountId: string) => {
    toggleAccountSelection(accountId);
  };

  const handleSetActive = (accountId: string) => {
    if (!canCustomize) return;
    if (selectedAccounts.includes(accountId)) {
      setActiveAccount(accountId);
    }
  };

  const handleToggleVisibleSelection = () => {
    if (filteredAccounts.length === 0) return;

    const filteredIds = filteredAccounts.map((account) => account.id);

    if (allFilteredSelected) {
      removeSelectedAccounts(filteredIds);
      return;
    }

    if (platformFilter === "ALL") {
      addSelectedAccounts(filteredIds);
      return;
    }

    replaceSelectedAccounts(filteredIds);
  };

  useEffect(() => {
    if (!canCustomize && activeAccount) {
      setActiveAccount(null);
    }
  }, [canCustomize, activeAccount, setActiveAccount]);

  useEffect(() => {
    if (activeAccount && !selectedAccounts.includes(activeAccount)) {
      setActiveAccount(null);
    }
  }, [activeAccount, selectedAccounts, setActiveAccount]);

  const handlePlatformFilterChange = (value: PlatformFilter) => {
    setPlatformFilter(value);

    if (value === "ALL") {
      const allIds = accounts.map((account) => account.id);
      replaceSelectedAccounts(allIds);
      return;
    }

    const filteredIds = accounts
      .filter((account) => account.platform === value)
      .map((account) => account.id);
    replaceSelectedAccounts(filteredIds);
  };

  const handleConnectForFilter = () => {
    if (platformFilter === "FACEBOOK") {
      handleConnectFacebook();
    } else if (platformFilter === "INSTAGRAM") {
      handleConnectInstagram();
    } else if (platformFilter === "TIKTOK") {
      handleConnectTikTok();
    }
  };

  return (
    <div className="space-y-2.5">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">Accounts</h3>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>
            {selectedAccounts.length}/{accounts.length}
          </span>
          {canCustomize && activeAccountData && activeMeta && (
            <div className="flex items-center gap-1.5 text-xs">
              {ActiveIcon && (
                <ActiveIcon
                  className={cn("h-3 w-3", activeMeta.accentTextClass)}
                />
              )}
              <span
                className="max-w-[120px] truncate text-foreground"
                title={activeAccountLabel || undefined}
              >
                {activeAccountLabel}
              </span>
              <span className="text-muted-foreground">• Customizing</span>
            </div>
          )}
        </div>
      </div>

      {canCustomize && activeAccountData && (
        <CustomizationScopeBanner
          account={activeAccountData}
          onClear={() => setActiveAccount(null)}
        />
      )}

      {/* Account Row */}
      {accounts.length === 0 ? (
        <div className="flex items-center justify-center py-4">
          <AvailablePlatformsRow
            onConnectFacebook={handleConnectFacebook}
            onConnectInstagram={handleConnectInstagram}
            onConnectTikTok={handleConnectTikTok}
            isConnecting={isConnecting}
            size="md"
          />
        </div>
      ) : (
        <>
          <AccountSelectionPlatformFilter
            options={platformFilterOptions}
            value={platformFilter}
            onChange={handlePlatformFilterChange}
            filteredCount={filteredAccounts.length}
            visibleSelectedCount={visibleSelectedCount}
            allFilteredSelected={allFilteredSelected}
            onToggleVisibleSelection={handleToggleVisibleSelection}
          />

          {filteredAccounts.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border/50 bg-muted/10 py-6 text-center">
              <p className="text-sm text-muted-foreground">
                {platformFilter === "ALL"
                  ? "No accounts available yet."
                  : `No ${activeFilterOption?.label ?? ""} accounts connected.`}
              </p>
              {platformFilter !== "ALL" && (
                <button
                  type="button"
                  onClick={handleConnectForFilter}
                  className="inline-flex items-center gap-2 rounded-full border border-border/60 px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  Connect {activeFilterOption?.label}
                </button>
              )}
            </div>
          ) : (
            <ComposerAccountsRow
              accounts={filteredAccounts}
              selectedAccounts={selectedAccounts}
              activeAccount={canCustomize ? filteredActiveAccount : null}
              onToggleAccount={handleToggleAccount}
              onSetActiveAccount={handleSetActive}
              showAddButton={true}
            />
          )}
        </>
      )}
    </div>
  );
}
