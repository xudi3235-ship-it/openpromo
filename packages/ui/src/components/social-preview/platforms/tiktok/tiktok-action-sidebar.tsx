import { cn } from "@openpromo/ui/lib/utils";
import { Bookmark, Heart, MessageCircle, Music2, Share2 } from "lucide-react";
import type { PreviewSize } from "../../types";

export interface TikTokActionSidebarProps {
  size?: PreviewSize;
  likes?: number;
  comments?: number;
  shares?: number;
}

export function TikTokActionSidebar({
  size = "default",
  likes,
  comments,
}: TikTokActionSidebarProps) {
  const isCompact = size === "thumbnail" || size === "compact";

  const iconSize = isCompact ? "w-3 h-3" : "w-3.5 h-3.5";
  const buttonSize = isCompact ? "w-7 h-7" : "w-8 h-8";
  const labelSize = isCompact ? "text-[9px]" : "text-[10px]";

  const formatCount = (count?: number) => {
    if (!count) return undefined;
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const actions = [
    { icon: Heart, label: formatCount(likes) || "Like" },
    { icon: MessageCircle, label: formatCount(comments) || "Comment" },
    { icon: Share2, label: "Share" },
  ];

  return (
    <div
      className={cn(
        "absolute z-10 flex flex-col items-center text-white/85",
        isCompact ? "right-1.5 bottom-10 gap-2.5" : "right-2 bottom-12 gap-3",
      )}
    >
      {actions.map(({ icon: Icon, label }) => (
        <div key={label} className="flex flex-col items-center gap-0.5">
          <div
            className={cn(
              "rounded-full border border-white/10 bg-black/45 backdrop-blur flex items-center justify-center",
              buttonSize,
            )}
          >
            <Icon className={iconSize} />
          </div>
          <span className={cn("font-medium", labelSize)}>{label}</span>
        </div>
      ))}
      <div
        className={cn(
          "rounded-full border border-white/10 bg-black/45 backdrop-blur flex items-center justify-center",
          buttonSize,
        )}
      >
        <Music2 className={iconSize} />
      </div>
      {/* Profile music disc at bottom */}
      <div
        className={cn(
          "rounded-full border-2 border-white/20 bg-black/60 backdrop-blur flex items-center justify-center",
          buttonSize,
        )}
      >
        <Bookmark className={cn(iconSize, "text-white/70")} />
      </div>
    </div>
  );
}
