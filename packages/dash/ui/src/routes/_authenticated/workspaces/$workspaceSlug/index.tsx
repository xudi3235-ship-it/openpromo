import { Button } from "@openpromo/ui/components/button";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, TrendingUp } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";
import { AvailablePlatformsRow } from "@/components/connected-accounts/available-platforms-row";
import { ConnectedAccountsRow } from "@/components/connected-accounts/connected-accounts-row";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useHonoMutation } from "@/lib/hono-client";
import { handlePopupMessage, openPopup } from "@/lib/popup";
import { useConnectedAccounts } from "@/queries/connected-account";

export const Route = createFileRoute(
  "/_authenticated/workspaces/$workspaceSlug/",
)({
  component: WorkspaceIndex,
});

function WorkspaceIndex() {
  const { data: connectedAccountsData } = useConnectedAccounts();
  const connectedAccounts = connectedAccountsData?.accounts || [];
  const { workspaceSlug } = Route.useParams();
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();

  useEffect(() => {
    function handleMessage(event: MessageEvent<unknown>) {
      const payload = handlePopupMessage(event, "accounts_connected");
      if (!payload) return;

      queryClient.invalidateQueries({
        queryKey: [workspace.slug, "connected_accounts"],
      });
      toast[payload.status](payload.message);
    }

    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [queryClient, workspace.slug]);

  // Facebook OAuth mutation
  const { mutate: initiateFacebookOAuth, isPending: isConnectingFacebook } =
    useHonoMutation({
      mutationFn: (api, variables: { state?: string }) =>
        api.workspaces[":workspaceSlug"].connected_accounts.facebook.auth.$get({
          query: { state: variables.state },
          param: { workspaceSlug: workspace.slug },
        }),
      onError: (error) => {
        toast.error(`Failed to initiate Facebook OAuth: ${error.message}`);
      },
      onSuccess({ data: { url } }) {
        openPopup({
          url,
          target: "facebook-oauth",
          width: 600,
          height: 800,
        });
      },
    });

  // Instagram OAuth mutation
  const { mutate: initiateInstagramOAuth, isPending: isConnectingInstagram } =
    useHonoMutation({
      mutationFn: (api, variables: { state?: string }) =>
        api.workspaces[":workspaceSlug"].connected_accounts.instagram.auth.$get(
          {
            query: { state: variables.state },
            param: { workspaceSlug: workspace.slug },
          },
        ),
      onError: (error) => {
        toast.error(`Failed to initiate Instagram OAuth: ${error.message}`);
      },
      onSuccess({ data: { url } }) {
        openPopup({
          url,
          target: "instagram-oauth",
          width: 600,
          height: 800,
        });
      },
    });

  const handleConnectFacebook = () => {
    initiateFacebookOAuth({});
  };

  const handleConnectInstagram = () => {
    initiateInstagramOAuth({});
  };

  const isConnecting = isConnectingFacebook || isConnectingInstagram;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Connected Accounts - Top Priority */}
        <div className="bg-card rounded-xl p-4 border border-border/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="font-medium text-foreground">Accounts</h2>
              {connectedAccounts.length > 0 && (
                <span className="text-sm text-muted-foreground">
                  {connectedAccounts.length} connected
                </span>
              )}
            </div>
          </div>

          {connectedAccounts.length > 0 ? (
            <div className="mt-4 flex items-center gap-3">
              <ConnectedAccountsRow accounts={connectedAccounts} size="md" />
              <div className="w-px h-4 bg-border" />
              <AvailablePlatformsRow
                onConnectFacebook={handleConnectFacebook}
                onConnectInstagram={handleConnectInstagram}
                isConnecting={isConnecting}
                size="md"
              />
            </div>
          ) : (
            <div className="mt-4 text-center py-4">
              <p className="text-sm text-muted-foreground mb-4">
                Connect your social media accounts to get started
              </p>
              <div className="flex items-center justify-center">
                <AvailablePlatformsRow
                  onConnectFacebook={handleConnectFacebook}
                  onConnectInstagram={handleConnectInstagram}
                  isConnecting={isConnecting}
                  size="lg"
                />
              </div>
            </div>
          )}
        </div>

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
