import { createFileRoute } from "@tanstack/react-router";
import { ComposerRoot } from "@/components/composer/layout/composer-root";
import { ComposerSkeleton } from "@/components/composer/layout/composer-skeleton";
import { useConnectedAccounts } from "@/queries/connected-account";

export const Route = createFileRoute(
  "/_authenticated/workspaces/$workspaceSlug/composer",
)({
  component: ComposerComponent,
});

function ComposerComponent() {
  const { accounts, isLoading } = useConnectedAccounts();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex max-w-7xl mx-auto">
          <ComposerSkeleton />
        </div>
      </div>
    );
  }

  // Layout handles null state now, so we can assume we have accounts here

  return (
    <div className="min-h-screen bg-background">
      <ComposerRoot accounts={accounts} className="min-h-screen" />
    </div>
  );
}
