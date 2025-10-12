import { Button } from "@openpromo/ui/components/button";
import { Skeleton } from "@openpromo/ui/components/skeleton";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, TrendingUp } from "lucide-react";
import { StylesInfiniteGrid } from "@/components/styles/styles-infinite-grid";
import { useConnectedAccounts } from "@/queries/connected-account";

function Loading() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <Skeleton className="h-32" />
        <Skeleton className="h-64" />
      </div>
    </div>
  );
}
export const Route = createFileRoute(
  "/_authenticated/workspaces/$workspaceSlug/",
)({
  component: WorkspaceIndex,
  pendingComponent: Loading,
});

function WorkspaceIndex() {
  const { workspaceSlug } = Route.useParams();
  const { isLoading } = useConnectedAccounts();

  // Show loading state
  if (isLoading) {
    return <Loading />;
  }

  // Layout handles null state now, so we can assume we have accounts here

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Welcome Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground mb-1">
              Welcome back
            </h1>
            <p className="text-sm text-muted-foreground">
              Ready to make some money?
            </p>
          </div>
          <Button asChild size="lg" className="gap-2">
            <Link
              to="/workspaces/$workspaceSlug/composer"
              params={{ workspaceSlug }}
            >
              <Plus className="h-5 w-5" />
              Create Post
            </Link>
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-card rounded-lg p-4 border border-border/40">
            <div className="text-center">
              <p className="text-2xl font-semibold text-foreground mb-1">0</p>
              <p className="text-xs text-muted-foreground">Posts This Week</p>
            </div>
          </div>

          <div className="bg-card rounded-lg p-4 border border-border/40">
            <div className="text-center">
              <p className="text-2xl font-semibold text-foreground mb-1">0</p>
              <p className="text-xs text-muted-foreground">Scheduled</p>
            </div>
          </div>

          <div className="bg-card rounded-lg p-4 border border-border/40">
            <div className="text-center">
              <p className="text-2xl font-semibold text-foreground mb-1">0</p>
              <p className="text-xs text-muted-foreground">Published</p>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-card rounded-xl p-5 border border-border/40">
          <h2 className="font-medium text-foreground mb-4">Recent Activity</h2>
          <div className="text-center py-6">
            <TrendingUp className="h-10 w-10 text-muted-foreground/50 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground mb-1">
              No recent activity
            </p>
            <p className="text-xs text-muted-foreground/70">
              Your posts and activities will appear here
            </p>
          </div>
        </div>

        {/* Styles Marketplace Preview */}
        <div className="bg-card rounded-xl border border-border/40 p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-medium text-foreground">
                Explore Creative Styles
              </h2>
              <p className="text-xs text-muted-foreground">
                Discover reusable visual systems to accelerate your next
                campaign.
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="self-start sm:self-auto"
            >
              <Link
                to="/workspaces/$workspaceSlug/styles"
                params={{ workspaceSlug }}
              >
                View marketplace
              </Link>
            </Button>
          </div>

          <div className="mt-4">
            <StylesInfiniteGrid
              className="gap-3"
              gridClassName="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
