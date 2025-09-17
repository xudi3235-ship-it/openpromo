import { Button } from "@openpromo/ui/components/button";
import { Skeleton } from "@openpromo/ui/components/skeleton";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, TrendingUp } from "lucide-react";
import { ConnectedAccountsSection } from "@/components/workspace/connected-accounts-section";
import { WorkspaceNullState } from "@/components/workspace/workspace-null-state";
import { useConnectedAccounts } from "@/queries/connected-account";

export const Route = createFileRoute(
  "/_authenticated/workspaces/$workspaceSlug/",
)({
  component: WorkspaceIndex,
});

function WorkspaceIndex() {
  const { workspaceSlug } = Route.useParams();
  const { data: connectedAccountsData, isLoading } = useConnectedAccounts();
  const connectedAccounts = connectedAccountsData?.accounts || [];

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          <ConnectedAccountsSection accounts={[]} isLoading={true} />

          <Skeleton className="h-32" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  // Show null state when no accounts are connected
  if (connectedAccounts.length === 0) {
    return (
      <WorkspaceNullState
        title="Welcome to OpenPromo"
        description="Connect your social media accounts to start creating and scheduling content"
        footerText="Choose a platform above to get started"
      />
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Connected Accounts - Top Priority */}
        <ConnectedAccountsSection
          accounts={connectedAccounts}
          isLoading={false}
        />

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
      </div>
    </div>
  );
}
