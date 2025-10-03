import { ConnectedAccountsSection } from "@/components/workspace/connected-accounts-section";
import { useConnectedAccounts } from "@/queries/connected-account";

interface WorkspaceConnectedAccountsBarProps {
  className?: string;
}

export function WorkspaceConnectedAccountsBar({
  className,
}: WorkspaceConnectedAccountsBarProps) {
  const { accounts, isLoading } = useConnectedAccounts();

  return (
    <ConnectedAccountsSection
      accounts={accounts}
      isLoading={isLoading}
      variant="bar"
      className={className}
    />
  );
}
