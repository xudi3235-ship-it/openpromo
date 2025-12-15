import { createFileRoute } from "@tanstack/react-router";
import { CancelConfirmationDialog } from "@/components/composer/dialogs/cancel-confirmation-dialog";
import { ComposerRoot } from "@/components/composer/layout/composer-root";
import { ComposerSkeleton } from "@/components/composer/layout/composer-skeleton";
import { useComposerNavigationGuard } from "@/hooks/useComposerNavigationGuard";
import {
  prefetchConnectedAccounts,
  useConnectedAccounts,
} from "@/queries/connected-account";
import { prefetchProductList } from "@/queries/product";
import { prefetchStylesList } from "@/queries/styles-queries";

export const Route = createFileRoute(
  "/_authenticated/workspaces/$workspaceSlug/composer",
)({
  loader: ({ params, context }) => {
    // Prefetch queries used in composer (do not await)
    prefetchConnectedAccounts(context.queryClient, params.workspaceSlug);
    prefetchProductList(context.queryClient, params.workspaceSlug, {});
    prefetchStylesList(context.queryClient, params.workspaceSlug, {
      page: 1,
      officialOnly: true,
    });
  },
  component: ComposerComponent,
  pendingComponent: ComposerPending,
});

function ComposerPending() {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <div className="mx-auto flex h-full w-full max-w-7xl px-4">
        <ComposerSkeleton />
      </div>
    </div>
  );
}

function ComposerComponent() {
  const { accounts, isPending } = useConnectedAccounts();
  const { isBlocked, proceed, reset } = useComposerNavigationGuard();

  if (isPending) {
    return <ComposerPending />;
  }

  // Layout handles null state now, so we can assume we have accounts here

  return (
    <>
      <div className="flex h-screen w-full overflow-hidden bg-background">
        <ComposerRoot
          accounts={accounts}
          className="mx-auto flex h-full w-full max-w-8xl px-2"
        />
      </div>

      <CancelConfirmationDialog
        open={isBlocked}
        onOpenChange={(open) => {
          if (!open && reset) reset();
        }}
        onConfirm={proceed}
      />
    </>
  );
}
