import { AvailablePlatformsRow } from "@/components/connected-accounts/available-platforms-row";
import { ComposerAccountsRow } from "@/components/connected-accounts/connected-accounts-row";
import { useOAuthWithListener } from "@/queries/connected-account";
import { useComposerStore } from "@/stores/composer-store";

export function AccountSelection() {
  const {
    accounts,
    selectedAccounts,
    setSelectedAccounts,
    activeAccount,
    setActiveAccount,
  } = useComposerStore();

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
    if (selectedAccounts.includes(accountId)) {
      setActiveAccount(accountId);
    }
  };

  return (
    <div className="space-y-3">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">Accounts</h3>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>
            {selectedAccounts.length}/{accounts.length}
          </span>
          {activeAccount && (
            <>
              <span>•</span>
              <span className="text-primary">customizing</span>
            </>
          )}
        </div>
      </div>

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
          activeAccount={activeAccount}
          onToggleAccount={handleToggleAccount}
          onSetActiveAccount={handleSetActive}
          showAddButton={true}
        />
      )}
    </div>
  );
}
