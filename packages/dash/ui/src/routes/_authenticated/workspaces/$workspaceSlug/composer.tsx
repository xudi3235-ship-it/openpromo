import { createFileRoute } from "@tanstack/react-router";
import { ComposerRoot } from "@/components/composer/layout/composer-root";
import { ComposerSkeleton } from "@/components/composer/layout/composer-skeleton";
import {
  prefetchConnectedAccounts,
  useConnectedAccounts,
} from "@/queries/connected-account";
import { prefetchProductList } from "@/queries/product";
import { prefetchStylesList } from "@/queries/styles";

export const Route = createFileRoute(
  "/_authenticated/workspaces/$workspaceSlug/composer",
)({
  loader: ({ params, context }) => {
    // Prefetch queries used in composer (do not await)
    prefetchConnectedAccounts(context.queryClient, params.workspaceSlug);
    prefetchProductList(context.queryClient, params.workspaceSlug, {});
    prefetchStylesList(context.queryClient, params.workspaceSlug, {
      page: "1",
      officialOnly: "true",
    });
  },
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
