import { cn } from "@openpromo/ui/lib/utils";
import { ConnectedAccountsSection } from "@/components/workspace/connected-accounts-section";
import { useConnectedAccounts } from "@/queries/connected-account";

interface WorkspaceConnectedAccountsBarProps {
  className?: string;
}

export function WorkspaceConnectedAccountsBar({
  className,
}: WorkspaceConnectedAccountsBarProps) {
  const { accounts, isPending } = useConnectedAccounts();

  return (
    <ConnectedAccountsSection
      accounts={accounts}
      isLoading={isPending}
      variant="bar"
      className={cn("shrink-0", className)}
    />
  );
}
