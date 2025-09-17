import { Badge } from "@openpromo/ui/components/badge";
import { Button } from "@openpromo/ui/components/button";
import { Typography } from "@openpromo/ui/components/typography";
import { Container, Stack } from "@openpromo/ui/layout";
import { Plus, Settings2, Users } from "lucide-react";
import { useState } from "react";
import {
  useConnectedAccounts,
  useOAuthWithListener,
} from "@/queries/connected-account";
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
    status: "available",
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
          <div className="space-y-2 mb-6">
            <div className="h-[18px] bg-sidebar-accent/50 rounded" />
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
      <Users className="w-12 h-12 mx-auto mb-4" />
      <Typography.H3 className="mb-2">No accounts connected</Typography.H3>
      <Typography.BodyBase className="mb-6">
        Connect your social media accounts to start publishing content
      </Typography.BodyBase>
      <Button onClick={onConnect} variant="default">
        <Plus className="w-4 h-4 mr-2" />
        Connect Your First Platform
      </Button>
    </div>
  );
}

function ConnectedAccountsContent({ onConnect }: { onConnect: () => void }) {
  const { data: connectedAccountsData, isPending } = useConnectedAccounts();
  const connectedAccounts = connectedAccountsData?.accounts || [];

  return (
    <Stack spacing="md">
      <div className="flex items-center justify-between">
        <Typography.H3>Active Connections</Typography.H3>
        <Badge
          variant="secondary"
          className={
            connectedAccounts.length > 0
              ? "bg-[var(--green-fill)] text-[var(--green-text)] border-[var(--green-stroke)]"
              : ""
          }
        >
          {connectedAccounts.length} connected
        </Badge>
      </div>

      {isPending ? (
        <ConnectedAccountsSkeleton />
      ) : connectedAccounts.length > 0 ? (
        <div className="card-grid-sm">
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
  const { handleConnectFacebook, handleConnectInstagram, isConnecting } =
    useOAuthWithListener();

  return (
    <div className="page-container">
      <Container size="xl" padding="none">
        <Stack spacing="xl">
          {/* Header */}
          <Stack spacing="lg">
            <div className="page-header">
              <Stack spacing="xs">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-sidebar-accent rounded-lg">
                    <Users className="w-5 h-5" />
                  </div>
                  <Typography.H2>Connected Accounts</Typography.H2>
                </div>
                <Typography.Large>
                  Manage your social media platform connections and publishing
                  settings
                </Typography.Large>
              </Stack>
              <Button onClick={() => setIsConnectDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Connect Platform
              </Button>
            </div>
          </Stack>

          {/* Connected Accounts */}
          <ConnectedAccountsContent
            onConnect={() => setIsConnectDialogOpen(true)}
          />

          {/* Available Platforms */}
          <Stack spacing="md">
            <Typography.H3>Available Platforms</Typography.H3>
            <div className="card-grid-sm">
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
                  <Typography.BodyBase className="mb-4">
                    {platform.description}
                  </Typography.BodyBase>
                  <Button
                    variant={
                      platform.status === "available" ? "default" : "secondary"
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
        onConnectInstagram={handleConnectInstagram}
        isConnecting={isConnecting}
      />
    </div>
  );
}
