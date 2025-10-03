import { cn } from "@openpromo/ui/lib/utils";
import { useEffect } from "react";
import { getPlatformMeta } from "@/components/composer/utils/platform-style";
import { AvailablePlatformsRow } from "@/components/connected-accounts/available-platforms-row";
import { ComposerAccountsRow } from "@/components/connected-accounts/connected-accounts-row";
import type { ConnectedAccount } from "@/lib/hono-client";
import { useOAuthWithListener } from "@/queries/connected-account";
import { useComposerStore } from "@/stores/composer-store";

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
      className="space-y-2 rounded-lg border border-border bg-muted/40 px-3 py-2"
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
    setSelectedAccounts,
    activeAccount,
    setActiveAccount,
  } = useComposerStore();

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

  const handleToggleAccount = (accountId: string) => {
    const newSelection = selectedAccounts.includes(accountId)
      ? selectedAccounts.filter((id: string) => id !== accountId)
      : [...selectedAccounts, accountId];
    setSelectedAccounts(newSelection);
  };

  const handleSetActive = (accountId: string) => {
    if (!canCustomize) return;
    if (selectedAccounts.includes(accountId)) {
      setActiveAccount(accountId);
    }
  };

  useEffect(() => {
    if (!canCustomize && activeAccount) {
      setActiveAccount(null);
    }
  }, [canCustomize, activeAccount, setActiveAccount]);

  return (
    <div className="space-y-3">
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
        <ComposerAccountsRow
          accounts={accounts}
          selectedAccounts={selectedAccounts}
          activeAccount={canCustomize ? activeAccount : null}
          onToggleAccount={handleToggleAccount}
          onSetActiveAccount={handleSetActive}
          showAddButton={true}
        />
      )}
    </div>
  );
}
