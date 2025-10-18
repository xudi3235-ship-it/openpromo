import { cn } from "@openpromo/ui/lib/utils";
import { getPlatformMeta } from "@/components/composer/utils/platform-style";

interface PlatformAvatarBadgeProps {
  platform: "FACEBOOK" | "INSTAGRAM" | "TIKTOK";
  className?: string;
}

export function PlatformAvatarBadge({
  platform,
  className,
}: PlatformAvatarBadgeProps) {
  const { icon: Icon, accentTextClass } = getPlatformMeta(platform);
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
