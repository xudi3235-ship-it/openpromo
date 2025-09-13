import { createFileRoute } from "@tanstack/react-router";
import { ComposerLeft } from "@/components/composer/composer-left";
import { ComposerNullState } from "@/components/composer/composer-null-state";
import { ComposerRight } from "@/components/composer/composer-right";
import { ComposerSkeleton } from "@/components/composer/composer-skeleton";
import { ComposerProvider } from "@/providers/composer-provider";
import { useConnectedAccounts } from "@/queries/connected-account";

export const Route = createFileRoute(
  "/_authenticated/workspaces/$workspaceSlug/composer",
)({
  component: ComposerComponent,
});

function ComposerComponent() {
  const { data, isLoading } = useConnectedAccounts();

  const handleConnectAccount = () => {
    // TODO: Open connect account dialog
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex max-w-7xl mx-auto">
          <ComposerSkeleton />
        </div>
      </div>
    );
  }

  // Show null state when no accounts are connected
  if (!data?.accounts || data.accounts.length === 0) {
    return <ComposerNullState onConnectAccount={handleConnectAccount} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="flex max-w-7xl mx-auto">
        <ComposerProvider
          initialAccounts={data.accounts}
          initialPlacementSelected="ALL"
          initialSelectedPreview="FACEBOOK"
          initialMessage="Hello world!"
        >
          <ComposerLeft />
          <ComposerRight />
        </ComposerProvider>
      </div>
    </div>
  );
}
