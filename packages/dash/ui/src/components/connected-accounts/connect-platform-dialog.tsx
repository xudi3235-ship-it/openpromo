import { Badge } from "@openpromo/ui/components/badge";
import { Button } from "@openpromo/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@openpromo/ui/components/dialog";
import { Typography } from "@openpromo/ui/components/typography";
import { ExternalLink, Plus } from "lucide-react";

interface ConnectPlatformDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnectFacebook: () => void;
  onConnectInstagram: () => void;
  onConnectTikTok: () => void;
  isConnecting: boolean;
}

const platforms = [
  {
    id: "facebook",
    name: "Facebook",
    description:
      "Connect your Facebook Pages to publish posts and manage content",
    icon: "https://logo.clearbit.com/facebook.com",
    available: true,
    permissions: ["Manage Pages", "Publish Posts", "Read Analytics"],
  },
  {
    id: "instagram",
    name: "Instagram",
    description: "Share photos and stories to your Instagram Business account",
    icon: "https://logo.clearbit.com/instagram.com",
    available: true,
    permissions: [
      "Basic Access",
      "Content Publishing",
      "Manage Comments",
      "Manage Messages",
    ],
  },
  {
    id: "tiktok",
    name: "TikTok",
    description: "Create and schedule TikTok videos for your business",
    icon: "https://logo.clearbit.com/tiktok.com",
    available: true,
    permissions: [
      "Profile Access",
      "Video Upload",
      "Video Publish",
      "Video List",
    ],
  },
];

export function ConnectPlatformDialog({
  open,
  onOpenChange,
  onConnectFacebook,
  onConnectInstagram,
  onConnectTikTok,
  isConnecting,
}: ConnectPlatformDialogProps) {
  const handleConnect = (platformId: string) => {
    if (platformId === "facebook") {
      onConnectFacebook();
      onOpenChange(false);
    } else if (platformId === "instagram") {
      onConnectInstagram();
      onOpenChange(false);
    } else if (platformId === "tiktok") {
      onConnectTikTok();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Connect Platform
          </DialogTitle>
          <DialogDescription>
            Choose a platform to connect to your workspace. You'll be redirected
            to authenticate with the platform.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 mt-4">
          {platforms.map((platform) => (
            <div
              key={platform.id}
              className={`p-4 rounded-xl border transition-all ${
                platform.available
                  ? "border-sidebar-border hover:border-sidebar-border/80 bg-sidebar"
                  : "border-sidebar-border/50 bg-sidebar/50"
              }`}
            >
              <div className="flex items-start gap-4">
                <img
                  src={platform.icon}
                  alt={platform.name}
                  className={`w-12 h-12 rounded-lg ${!platform.available ? "opacity-50" : ""}`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Typography.H4>{platform.name}</Typography.H4>
                    {!platform.available && (
                      <span className="px-2 py-1 text-xs bg-sidebar-accent rounded-full">
                        Coming Soon
                      </span>
                    )}
                  </div>
                  <Typography.BodySm className="mb-3">
                    {platform.description}
                  </Typography.BodySm>

                  {platform.available && platform.permissions && (
                    <div className="mb-3">
                      <Typography.Small className="font-medium mb">
                        Required permissions:
                      </Typography.Small>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {platform.permissions.map((permission) => (
                          <Badge key={permission} variant="announcement-pill">
                            {permission}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <Button
                  variant={platform.available ? "default" : "secondary"}
                  disabled={
                    !platform.available ||
                    ((platform.id === "facebook" ||
                      platform.id === "instagram" ||
                      platform.id === "tiktok") &&
                      isConnecting)
                  }
                  onClick={() => handleConnect(platform.id)}
                  className="shrink-0"
                >
                  {platform.available ? (
                    (platform.id === "facebook" ||
                      platform.id === "instagram" ||
                      platform.id === "tiktok") &&
                    isConnecting ? (
                      "Connecting..."
                    ) : (
                      <>
                        Connect
                        <ExternalLink className="w-4 h-4 ml-2" />
                      </>
                    )
                  ) : (
                    "Coming Soon"
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-sidebar-accent/50 rounded-lg border border-sidebar-border/50">
          <Typography.Small>
            <strong>Note:</strong> You'll be redirected to the platform's
            authentication page. Make sure you have the necessary permissions
            for the accounts you want to connect.
          </Typography.Small>
        </div>
      </DialogContent>
    </Dialog>
  );
}
