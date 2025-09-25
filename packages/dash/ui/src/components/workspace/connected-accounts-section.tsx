import { AvailablePlatformsRow } from "@/components/connected-accounts/available-platforms-row";
import {
  ConnectedAccountsRow,
  ConnectedAccountsRowSkeleton,
} from "@/components/connected-accounts/connected-accounts-row";
import type { ConnectedAccount } from "@/lib/hono-client";
import { useOAuthWithListener } from "@/queries/connected-account";

interface ConnectedAccountsSectionProps {
  accounts: ConnectedAccount[];
  isLoading: boolean;
}

export function ConnectedAccountsSection({
  accounts,
  isLoading,
}: ConnectedAccountsSectionProps) {
  const {
    handleConnectFacebook,
    handleConnectInstagram,
    handleConnectTikTok,
    isConnecting,
    deleteConnectedAccount,
  } = useOAuthWithListener();

  const handleDeleteAccount = (accountId: string) => {
    deleteConnectedAccount({ accountId });
  };

  return (
    <div className="bg-card rounded-xl p-4 border border-border/40">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="font-medium text-foreground">Accounts</h2>
          {accounts.length > 0 && (
            <span className="text-sm text-muted-foreground">
              {accounts.length} connected
            </span>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="mt-4">
          <ConnectedAccountsRowSkeleton />
        </div>
      ) : accounts.length > 0 ? (
        <div className="mt-4">
          <ConnectedAccountsRow
            accounts={accounts}
            size="md"
            onDeleteAccount={handleDeleteAccount}
            showAddButton={true}
          />
        </div>
      ) : (
        <div className="mt-4 text-center py-4">
          <p className="text-sm text-muted-foreground mb-4">
            Connect your social media accounts to get started
          </p>
          <div className="flex items-center justify-center">
            <AvailablePlatformsRow
              onConnectFacebook={handleConnectFacebook}
              onConnectInstagram={handleConnectInstagram}
              onConnectTikTok={handleConnectTikTok}
              isConnecting={isConnecting}
              size="lg"
            />
          </div>
        </div>
      )}
    </div>
  );
}
