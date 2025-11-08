import { createFileRoute } from "@tanstack/react-router";
import { ComposerRoot } from "@/components/composer/layout/composer-root";
import { ComposerSkeleton } from "@/components/composer/layout/composer-skeleton";
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
});

function ComposerComponent() {
  const { accounts, isLoading } = useConnectedAccounts();

  if (isLoading) {
    return (
      <div className="flex h-screen w-full overflow-hidden bg-background">
        <div className="mx-auto flex h-full w-full max-w-7xl px-4">
          <ComposerSkeleton />
        </div>
      </div>
    );
  }

  // Layout handles null state now, so we can assume we have accounts here

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <ComposerRoot
        accounts={accounts}
        className="mx-auto flex h-full w-full max-w-7xl px-4"
      />
    </div>
  );
}
