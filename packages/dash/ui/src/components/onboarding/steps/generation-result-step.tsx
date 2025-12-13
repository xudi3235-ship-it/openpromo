"use client";

import { Button } from "@openpromo/ui/components/button";
import {
  InstagramFeedPreview,
  type PreviewData,
} from "@openpromo/ui/components/social-preview";
import { cn } from "@openpromo/ui/lib/utils";
import { Download, Plus, RotateCcw } from "lucide-react";
import { useOAuthWithListener } from "@/queries/connected-account";

const PLATFORMS = [
  {
    id: "instagram",
    name: "Instagram",
    gradient: "from-purple-500 via-pink-500 to-orange-500",
  },
  {
    id: "facebook",
    name: "Facebook",
    gradient: "from-blue-500 to-blue-600",
  },
  {
    id: "tiktok",
    name: "TikTok",
    gradient: "from-cyan-400 via-black to-pink-500",
  },
];

interface GenerationResultStepProps {
  generatedImageUrl: string;
  onTryAnother: () => void;
}

export function GenerationResultStep({
  generatedImageUrl,
  onTryAnother,
}: GenerationResultStepProps) {
  const {
    handleConnectFacebook,
    handleConnectInstagram,
    handleConnectTikTok,
    isConnecting,
  } = useOAuthWithListener();

  const handlePlatformClick = (platformId: string) => {
    if (isConnecting) return;
    switch (platformId) {
      case "facebook":
        handleConnectFacebook();
        break;
      case "instagram":
        handleConnectInstagram();
        break;
      case "tiktok":
        handleConnectTikTok();
        break;
    }
  };

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = generatedImageUrl;
    link.download = "openpromo-ad.png";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const previewData: PreviewData = {
    accountName: "your_brand",
    profilePicUrl: null,
    caption: "Check out our latest! Shop now and get 20% off your first order.",
    media: [{ type: "photo", url: generatedImageUrl }],
    metrics: { likes: 1234, comments: 56 },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">
          Your ad is ready!
        </h2>
        <p className="text-muted-foreground">
          Connect an account to start posting
        </p>
      </div>

      {/* Content: Preview + Connect */}
      <div className="flex flex-col md:flex-row gap-8 items-center justify-center">
        {/* Social Preview */}
        <div className="shrink-0">
          <InstagramFeedPreview data={previewData} size="compact" />
        </div>

        {/* Connect platforms */}
        <div className="flex flex-col items-center gap-6">
          <p className="text-sm text-muted-foreground">Connect to publish</p>

          <div className="flex gap-4">
            {PLATFORMS.map((platform) => (
              <button
                key={platform.id}
                type="button"
                onClick={() => handlePlatformClick(platform.id)}
                disabled={isConnecting}
                className={cn(
                  "group flex flex-col items-center gap-2 transition-all",
                  isConnecting && "opacity-50 cursor-not-allowed",
                )}
              >
                <div
                  className={cn(
                    "relative flex items-center justify-center size-14 rounded-full",
                    "bg-gradient-to-br",
                    platform.gradient,
                    "group-hover:scale-105 transition-transform",
                  )}
                >
                  <div className="absolute inset-1 rounded-full bg-background flex items-center justify-center">
                    <Plus className="size-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>
                </div>
                <span className="text-xs font-medium">{platform.name}</span>
              </button>
            ))}
          </div>

          {/* Secondary actions */}
          <div className="flex items-center gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={onTryAnother}>
              <RotateCcw className="mr-1.5 size-3.5" />
              Try another
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="mr-1.5 size-3.5" />
              Download
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
