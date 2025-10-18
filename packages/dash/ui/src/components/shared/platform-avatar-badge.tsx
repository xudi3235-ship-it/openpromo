import type { Platform } from "@core/schemas/connected-account.sql";
import { cn } from "@openpromo/ui/lib/utils";
import type { AllPlatforms } from "@shared";
import { getPlatformMeta } from "@/components/composer/utils/platform-style";

function toConnectedPlatform(platform: AllPlatforms): Platform {
  switch (platform) {
    case "FACEBOOK":
    case "INSTAGRAM":
    case "TIKTOK":
      return platform;
    default:
      return "FACEBOOK";
  }
}

interface PlatformAvatarBadgeProps {
  platform: AllPlatforms;
  className?: string;
}

export function PlatformAvatarBadge({
  platform,
  className,
}: PlatformAvatarBadgeProps) {
  const { icon: Icon, accentTextClass } = getPlatformMeta(
    toConnectedPlatform(platform),
  );
  if (!Icon) return null;

  return (
    <div
      className={cn(
        "absolute -bottom-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full border bg-background text-muted-foreground shadow-sm",
        accentTextClass,
        className,
      )}
    >
      <Icon className="h-3 w-3" />
    </div>
  );
}
