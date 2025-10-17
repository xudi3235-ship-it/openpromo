import { cn } from "@openpromo/ui/lib/utils";
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
  variant?: "card" | "bar";
  className?: string;
}

export function ConnectedAccountsSection({
  accounts,
  isLoading,
  variant = "card",
  className,
}: ConnectedAccountsSectionProps) {
  const {
    handleConnectFacebook,
    handleConnectInstagram,
    handleConnectTikTok,
    isConnecting,
  } = useOAuthWithListener();

  if (variant === "bar") {
    if (isLoading) {
      return (
        <ConnectedAccountsRowSkeleton
          className={cn("w-full", className)}
          fullWidth
          appearance="minimal"
        />
      );
    }

    if (accounts.length > 0) {
      return (
        <ConnectedAccountsRow
          accounts={accounts}
          showAddButton={true}
          className={cn("w-full", className)}
          fullWidth
          appearance="minimal"
        />
      );
    }

    return (
      <div className={cn("w-full", className)}>
        <AvailablePlatformsRow
          onConnectFacebook={handleConnectFacebook}
          onConnectInstagram={handleConnectInstagram}
          onConnectTikTok={handleConnectTikTok}
          isConnecting={isConnecting}
          size="md"
        />
      </div>
    );
  }

  const containerClasses = "bg-card rounded-xl p-4 border border-border/40";

  return (
    <div className={cn(containerClasses, className)}>
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
          <ConnectedAccountsRow accounts={accounts} showAddButton={true} />
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
