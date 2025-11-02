import { cn } from "@openpromo/ui/lib/utils";
import { Briefcase } from "lucide-react";
import { getPlatformMeta } from "@/components/composer/utils/platform-style";

interface PlatformAvatarBadgeProps {
  platform: "FACEBOOK" | "INSTAGRAM" | "TIKTOK";
  className?: string;
  isBusiness?: boolean;
}

export function PlatformAvatarBadge({
  platform,
  className,
  isBusiness = false,
}: PlatformAvatarBadgeProps) {
  const { icon: Icon, accentTextClass } = getPlatformMeta(platform);
  if (!Icon) return null;

  return (
    <div
      className={cn(
        "absolute -bottom-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full border bg-background text-muted-foreground shadow-sm",
        accentTextClass,
        isBusiness && platform === "TIKTOK" && "border-2 border-blue-500",
        className,
      )}
    >
      <Icon className="h-3 w-3" />
      {isBusiness && platform === "TIKTOK" && (
        <Briefcase className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-blue-500 text-white p-0.5" />
      )}
    </div>
  );
}
