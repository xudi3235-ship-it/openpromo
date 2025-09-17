import { createFileRoute } from "@tanstack/react-router";
import { ComposerSkeleton } from "@/components/composer/composer-skeleton";
import { ResizableComposer } from "@/components/composer/resizable-composer";
import { WorkspaceNullState } from "@/components/workspace/workspace-null-state";
import { useConnectedAccounts } from "@/queries/connected-account";

export const Route = createFileRoute(
  "/_authenticated/workspaces/$workspaceSlug/composer",
)({
  component: ComposerComponent,
});

function ComposerComponent() {
  const { data, isLoading } = useConnectedAccounts();

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
    return <WorkspaceNullState />;
  }

  return (
    <div className="min-h-screen bg-background">
      <ResizableComposer accounts={data.accounts} className="min-h-screen" />
    </div>
  );
}
