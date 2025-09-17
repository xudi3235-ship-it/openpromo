import { AvailablePlatformsRow } from "@/components/connected-accounts/available-platforms-row";
import { ConnectedAccountsRow } from "@/components/connected-accounts/connected-accounts-row";
import {
  useConnectedAccounts,
  useOAuthWithListener,
} from "@/queries/connected-account";

export function ConnectedAccountsSection() {
  const { data: connectedAccountsData } = useConnectedAccounts();
  const connectedAccounts = connectedAccountsData?.accounts || [];

  const { handleConnectFacebook, handleConnectInstagram, isConnecting } =
    useOAuthWithListener();

  return (
    <div className="bg-card rounded-xl p-4 border border-border/40">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="font-medium text-foreground">Accounts</h2>
          {connectedAccounts.length > 0 && (
            <span className="text-sm text-muted-foreground">
              {connectedAccounts.length} connected
            </span>
          )}
        </div>
      </div>

      {connectedAccounts.length > 0 ? (
        <div className="mt-4 flex items-center gap-3">
          <ConnectedAccountsRow accounts={connectedAccounts} size="md" />
          <div className="w-px h-4 bg-border" />
          <AvailablePlatformsRow
            onConnectFacebook={handleConnectFacebook}
            onConnectInstagram={handleConnectInstagram}
            isConnecting={isConnecting}
            size="md"
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
              isConnecting={isConnecting}
              size="lg"
            />
          </div>
        </div>
      )}
    </div>
  );
}
