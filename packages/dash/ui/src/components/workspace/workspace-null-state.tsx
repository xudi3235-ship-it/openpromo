import { Plus } from "lucide-react";
import { useOAuthWithListener } from "@/queries/connected-account";

interface WorkspaceNullStateProps {
  /** Main title text */
  title?: string;
  /** Description text below the title */
  description?: string;
  /** Footer text below the platforms */
  footerText?: string;
  /** Whether to show the full page layout with background */
  fullPage?: boolean;
  /** Custom className for the container */
  className?: string;
}

const platforms = [
  {
    id: "facebook",
    name: "Facebook",
    colors: "from-blue-500 to-blue-600",
    bgColor: "bg-blue-500",
    available: true,
  },
  {
    id: "instagram",
    name: "Instagram",
    colors: "from-purple-500 via-pink-500 to-orange-500",
    bgColor: "bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500",
    available: true,
  },
  {
    id: "tiktok",
    name: "TikTok",
    colors: "from-black to-gray-800",
    bgColor: "bg-black",
    available: true,
  },
];

export function WorkspaceNullState({
  title = "Connect to get started",
  description = "Choose a platform to connect and start creating content",
  footerText = "Tap a platform above to connect your account",
  fullPage = true,
  className = "",
}: WorkspaceNullStateProps) {
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

  const content = (
    <div className="flex flex-col items-center justify-center text-center max-w-sm mx-auto">
      <h2 className="text-lg font-medium text-foreground mb-2">{title}</h2>

      <p className="text-sm text-muted-foreground mb-8">{description}</p>

      <div className="flex items-center gap-4 mb-6">
        {platforms.map((platform) => (
          <div key={platform.id} className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => handlePlatformClick(platform.id)}
              disabled={!platform.available || isConnecting}
              className={`relative w-16 h-16 rounded-full p-0.5 transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-ring ${
                platform.available && !isConnecting
                  ? "cursor-pointer"
                  : "cursor-not-allowed opacity-50"
              }`}
              aria-label={`Connect to ${platform.name}`}
            >
              {/* Gradient border */}
              <div
                className={`w-full h-full rounded-full bg-gradient-to-r ${platform.colors} p-0.5`}
              >
                {/* Inner circle */}
                <div className="w-full h-full bg-background rounded-full flex items-center justify-center">
                  <div className="relative w-10 h-10 rounded-full flex items-center justify-center">
                    {/* Platform background */}
                    <div
                      className={`absolute inset-0 rounded-full ${platform.bgColor}`}
                    />

                    {/* Plus icon */}
                    <Plus className="relative z-10 h-5 w-5 text-white" />
                  </div>
                </div>
              </div>

              {/* Loading indicator */}
              {isConnecting && platform.available && (
                <div className="absolute inset-0 rounded-full bg-background/80 flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </button>

            <div className="text-center">
              <span
                className={`text-xs font-medium block ${
                  platform.available
                    ? "text-foreground"
                    : "text-muted-foreground"
                }`}
              >
                {platform.name}
              </span>
              <span className="text-xs text-muted-foreground/60 h-4 flex items-center justify-center">
                {!platform.available && "Soon"}
              </span>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">{footerText}</p>
    </div>
  );

  if (fullPage) {
    return (
      <div className={`min-h-screen bg-background ${className}`}>
        <div className="flex max-w-7xl mx-auto">
          <div className="w-full flex items-center justify-center p-8">
            {content}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-center p-8 ${className}`}>
      {content}
    </div>
  );
}
