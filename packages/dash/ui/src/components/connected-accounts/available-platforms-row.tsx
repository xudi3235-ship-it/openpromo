import { Plus } from "lucide-react";

interface Platform {
  id: string;
  name: string;
  colors: string;
  available: boolean;
}

const platforms: Platform[] = [
  {
    id: "facebook",
    name: "Facebook",
    colors: "from-blue-500 to-blue-600",
    available: true,
  },
  {
    id: "instagram",
    name: "Instagram",
    colors: "from-purple-500 via-pink-500 to-orange-500",
    available: true,
  },
  {
    id: "tiktok",
    name: "TikTok",
    colors: "from-black to-gray-800",
    available: false,
  },
];

interface AvailablePlatformsRowProps {
  onConnectFacebook: () => void;
  onConnectInstagram: () => void;
  onConnectTikTok?: () => void;
  isConnecting: boolean;
  size?: "sm" | "md" | "lg";
}

export function AvailablePlatformsRow({
  onConnectFacebook,
  onConnectInstagram,
  onConnectTikTok,
  isConnecting,
  size = "md",
}: AvailablePlatformsRowProps) {
  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-8 h-8",
    lg: "w-10 h-10",
  };

  const iconSizes = {
    sm: "h-2.5 w-2.5",
    md: "h-3 w-3",
    lg: "h-4 w-4",
  };

  const handlePlatformClick = (platformId: string) => {
    if (isConnecting) return;

    switch (platformId) {
      case "facebook":
        onConnectFacebook();
        break;
      case "instagram":
        onConnectInstagram();
        break;
      case "tiktok":
        onConnectTikTok?.();
        break;
    }
  };

  // Show all platforms since we allow multiple accounts per platform
  // Only filter out TikTok if not available
  const availablePlatforms = platforms.filter((platform) => platform.available);

  return (
    <div className="flex items-center gap-1">
      {availablePlatforms.map((platform) => (
        <div key={platform.id} className="relative group">
          <button
            type="button"
            onClick={() => handlePlatformClick(platform.id)}
            disabled={!platform.available || isConnecting}
            className={`${sizeClasses[size]} rounded-full bg-gradient-to-r ${platform.colors} p-0.5 transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-ring ${
              platform.available && !isConnecting
                ? "cursor-pointer opacity-70 hover:opacity-100"
                : "cursor-not-allowed opacity-30"
            }`}
            aria-label={`Connect to ${platform.name}`}
          >
            <div className="w-full h-full bg-background rounded-full flex items-center justify-center">
              {isConnecting && platform.available ? (
                <div className="w-3 h-3 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
              ) : (
                <Plus className={`${iconSizes[size]} text-muted-foreground`} />
              )}
            </div>
          </button>

          {/* Tooltip */}
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded shadow-md border opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
            Add {platform.name} account
          </div>
        </div>
      ))}
    </div>
  );
}
