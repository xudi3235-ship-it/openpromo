import { ExternalLink, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Typography } from "@/components/ui/typography";

interface ConnectPlatformDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnectFacebook: () => void;
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
    available: false,
  },
  {
    id: "tiktok",
    name: "TikTok",
    description: "Create and schedule TikTok videos for your business",
    icon: "https://logo.clearbit.com/tiktok.com",
    available: false,
  },
];

export function ConnectPlatformDialog({
  open,
  onOpenChange,
  onConnectFacebook,
  isConnecting,
}: ConnectPlatformDialogProps) {
  const handleConnect = (platformId: string) => {
    if (platformId === "facebook") {
      onConnectFacebook();
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
                      <span className="px-2 py-1 text-xs bg-sidebar-accent text-[var(--neutral-600)] rounded-full">
                        Coming Soon
                      </span>
                    )}
                  </div>
                  <Typography.BodyBase className="text-[var(--neutral-600)] mb-3">
                    {platform.description}
                  </Typography.BodyBase>

                  {platform.available && platform.permissions && (
                    <div className="mb-3">
                      <Typography.Small className="text-[var(--neutral-700)] font-medium mb-2">
                        Required permissions:
                      </Typography.Small>
                      <div className="flex flex-wrap gap-1">
                        {platform.permissions.map((permission) => (
                          <span
                            key={permission}
                            className="px-2 py-1 text-xs bg-[var(--green-fill)] text-[var(--green-text)] border border-[var(--green-stroke)] rounded-full"
                          >
                            {permission}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <Button
                  variant={platform.available ? "primary" : "secondary"}
                  disabled={
                    !platform.available ||
                    (platform.id === "facebook" && isConnecting)
                  }
                  onClick={() => handleConnect(platform.id)}
                  className="shrink-0"
                >
                  {platform.available ? (
                    platform.id === "facebook" && isConnecting ? (
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
          <Typography.Small className="text-[var(--neutral-700)]">
            <strong>Note:</strong> You'll be redirected to the platform's
            authentication page. Make sure you have the necessary permissions
            for the accounts you want to connect.
          </Typography.Small>
        </div>
      </DialogContent>
    </Dialog>
  );
}
