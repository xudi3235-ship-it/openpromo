import { Plus, Settings2, Users } from "lucide-react";
import { Suspense, useState } from "react";
import { toast } from "sonner";
import { Container, Stack } from "@/components/_layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Typography } from "@/components/ui/typography";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useHonoMutation, useHonoSuspenseQuery } from "@/lib/hono-client";
import { ConnectPlatformDialog } from "./connect-platform-dialog";
import { ConnectedAccountCard } from "./connected-account-card";

const availablePlatforms = [
  {
    id: "facebook",
    name: "Facebook",
    description: "Connect your Facebook Pages and manage posts",
    icon: "https://logo.clearbit.com/facebook.com",
    status: "available",
  },
  {
    id: "instagram",
    name: "Instagram",
    description: "Share photos and stories to Instagram",
    icon: "https://logo.clearbit.com/instagram.com",
    status: "coming_soon",
  },
  {
    id: "tiktok",
    name: "TikTok",
    description: "Create and schedule TikTok videos",
    icon: "https://logo.clearbit.com/tiktok.com",
    status: "coming_soon",
  },
];

function ConnectedAccountsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="p-6 bg-sidebar rounded-xl border border-sidebar-border animate-pulse"
        >
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 bg-sidebar-accent rounded-lg" />
            <div className="flex-1">
              <div className="h-4 bg-sidebar-accent rounded mb-2" />
              <div className="h-3 bg-sidebar-accent/50 rounded w-20" />
            </div>
          </div>
          <div className="space-y-2 mb-4">
            <div className="h-3 bg-sidebar-accent/50 rounded" />
            <div className="h-3 bg-sidebar-accent/50 rounded w-24" />
          </div>
          <div className="h-9 bg-sidebar-accent/50 rounded" />
        </div>
      ))}
    </div>
  );
}

function EmptyConnectedAccounts({ onConnect }: { onConnect: () => void }) {
  return (
    <div className="text-center py-12 bg-sidebar rounded-xl border border-sidebar-border">
      <Users className="w-12 h-12 text-[var(--neutral-600)] mx-auto mb-4" />
      <Typography.H3 className="mb-2">No accounts connected</Typography.H3>
      <Typography.BodyBase className="text-[var(--neutral-600)] mb-6">
        Connect your social media accounts to start publishing content
      </Typography.BodyBase>
      <Button onClick={onConnect} variant="primary">
        <Plus className="w-4 h-4 mr-2" />
        Connect Your First Platform
      </Button>
    </div>
  );
}

function ConnectedAccountsContent({ onConnect }: { onConnect: () => void }) {
  const { workspace } = useWorkspace();

  // Get connected accounts with error handling
  const { data: connectedAccountsData, error } = useHonoSuspenseQuery({
    queryKey: [workspace.slug, "connected_accounts"],
    queryFn: (api) =>
      api.workspaces[":workspaceSlug"].connected_accounts.$get({
        param: { workspaceSlug: workspace.slug },
      }),
  });

  // Show error toast if query fails
  if (error) {
    toast.error(`Failed to load connected accounts: ${error.message}`);
  }

  const connectedAccounts = connectedAccountsData?.accounts || [];

  return (
    <Stack spacing="xl">
      <div className="flex items-center justify-between">
        <Typography.H2>Active Connections</Typography.H2>
        <Badge
          variant="secondary"
          className="bg-[var(--green-fill)] text-[var(--green-text)] border-[var(--green-stroke)]"
        >
          {connectedAccounts.length} connected
        </Badge>
      </div>

      {connectedAccounts.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {connectedAccounts.map((account) => (
            <ConnectedAccountCard
              key={account.id}
              account={{
                id: account.id,
                platform: account.platform,
                accountName: account.accountName ?? "Unknown",
                accountId:
                  account.externalAccountId ||
                  `@${account?.accountName?.toLowerCase().replace(/\s+/g, "")}`,
                avatar: `https://logo.clearbit.com/${account.platform}.com`,
                isConnected: true,
                lastSync: "Recently",
              }}
            />
          ))}
        </div>
      ) : (
        <EmptyConnectedAccounts onConnect={onConnect} />
      )}
    </Stack>
  );
}

export function ConnectedAccountsPage() {
  const [isConnectDialogOpen, setIsConnectDialogOpen] = useState(false);
  const { workspace } = useWorkspace();

  // Facebook OAuth mutation
  const { mutate: initiateFacebookOAuth, isPending: isConnecting } =
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
        toast.success("Redirecting to Facebook authentication...");
        const popup = window.open(
          url,
          "facebook-oauth",
          "width=600,height=700,scrollbars=yes,resizable=yes,status=yes,location=yes,toolbar=no,menubar=no,left=" +
            (screen.width / 2 - 300) +
            ",top=" +
            (screen.height / 2 - 350),
        );

        if (popup) {
          popup.focus();
        }
      },
    });

  const handleConnectFacebook = () => {
    initiateFacebookOAuth({});
  };

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <Container size="xl">
        <Stack spacing="2xl">
          {/* Header */}
          <Stack spacing="lg">
            <div className="flex items-center justify-between">
              <Stack spacing="xs">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-sidebar-accent rounded-lg">
                    <Users className="w-5 h-5 text-[var(--neutral-700)]" />
                  </div>
                  <Typography.H1>Connected Accounts</Typography.H1>
                </div>
                <Typography.BodyLg className="text-[var(--neutral-600)]">
                  Manage your social media platform connections and publishing
                  settings
                </Typography.BodyLg>
              </Stack>
              <Button
                onClick={() => setIsConnectDialogOpen(true)}
                className="bg-[var(--neutral-800)] text-white hover:bg-[var(--neutral-700)]"
              >
                <Plus className="w-4 h-4 mr-2" />
                Connect Platform
              </Button>
            </div>
          </Stack>

          {/* Connected Accounts */}
          <Suspense fallback={<ConnectedAccountsSkeleton />}>
            <ConnectedAccountsContent
              onConnect={() => setIsConnectDialogOpen(true)}
            />
          </Suspense>

          {/* Available Platforms */}
          <Stack spacing="xl">
            <Typography.H2>Available Platforms</Typography.H2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {availablePlatforms.map((platform) => (
                <div
                  key={platform.id}
                  className="p-6 bg-sidebar rounded-xl border border-sidebar-border hover:border-sidebar-border/80 transition-colors"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={platform.icon}
                        alt={platform.name}
                        className="w-8 h-8 rounded-lg"
                      />
                      <div>
                        <Typography.H4>{platform.name}</Typography.H4>
                        {platform.status === "coming_soon" && (
                          <Badge variant="secondary" className="mt-1 text-xs">
                            Coming Soon
                          </Badge>
                        )}
                      </div>
                    </div>
                    {platform.status === "available" && (
                      <Button size="sm" variant="ghost">
                        <Settings2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  <Typography.BodyBase className="text-[var(--neutral-600)] mb-4">
                    {platform.description}
                  </Typography.BodyBase>
                  <Button
                    variant={
                      platform.status === "available" ? "primary" : "secondary"
                    }
                    disabled={platform.status === "coming_soon"}
                    onClick={() =>
                      platform.status === "available" &&
                      setIsConnectDialogOpen(true)
                    }
                    className="w-full"
                  >
                    {platform.status === "available"
                      ? "Connect"
                      : "Coming Soon"}
                  </Button>
                </div>
              ))}
            </div>
          </Stack>
        </Stack>
      </Container>

      <ConnectPlatformDialog
        open={isConnectDialogOpen}
        onOpenChange={setIsConnectDialogOpen}
        onConnectFacebook={handleConnectFacebook}
        isConnecting={isConnecting}
      />
    </div>
  );
}
