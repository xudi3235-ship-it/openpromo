import { Button } from "@openpromo/ui/components/button";
import { cn } from "@openpromo/ui/lib/utils";
import { Bookmark, Heart, MessageCircle, Send, Share2 } from "lucide-react";
import type { BasePreviewProps, PreviewPlatform } from "../types";

export interface PreviewActionsProps extends BasePreviewProps {
  platform: PreviewPlatform;
  metrics?: {
    likes?: number;
    comments?: number;
    shares?: number;
  };
  /** Layout orientation */
  layout?: "horizontal" | "vertical";
  /** Whether to show metrics numbers */
  showMetrics?: boolean;
}

function formatMetric(value?: number): string {
  if (!value) return "";
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toString();
}

export function PreviewActions({
  platform,
  metrics,
  layout = "horizontal",
  showMetrics = true,
  size = "default",
  className,
}: PreviewActionsProps) {
  const isCompact = size === "thumbnail" || size === "compact";
  const iconSize = isCompact ? "w-4 h-4" : "w-5 h-5";
  const textSize = isCompact ? "text-[10px]" : "text-xs";
  const spacing = isCompact ? "gap-1" : "gap-2";

  // Platform-specific icon sets
  const getIcons = () => {
    switch (platform) {
      case "FACEBOOK":
        return {
          like: <Heart className={iconSize} />,
          comment: <MessageCircle className={iconSize} />,
          share: <Share2 className={iconSize} />,
        };
      case "INSTAGRAM":
        return {
          like: <Heart className={iconSize} />,
          comment: <MessageCircle className={iconSize} />,
          share: <Send className={iconSize} />,
          save: <Bookmark className={iconSize} />,
        };
      case "TIKTOK":
        return {
          like: <Heart className={iconSize} />,
          comment: <MessageCircle className={iconSize} />,
          share: <Share2 className={iconSize} />,
          save: <Bookmark className={iconSize} />,
        };
      default:
        return {
          like: <Heart className={iconSize} />,
          comment: <MessageCircle className={iconSize} />,
          share: <Share2 className={iconSize} />,
        };
    }
  };

  const icons = getIcons();

  const ActionButton = ({
    icon,
    label,
    count,
  }: {
    icon: React.ReactNode;
    label: string;
    count?: number;
  }) => (
    <div className={cn("flex items-center", spacing)}>
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "p-0 h-auto hover:bg-transparent",
          isCompact && "pointer-events-none",
        )}
        aria-label={label}
      >
        {icon}
      </Button>
      {showMetrics && count !== undefined && (
        <span className={cn("font-medium", textSize)}>
          {formatMetric(count)}
        </span>
      )}
    </div>
  );

  if (layout === "vertical") {
    return (
      <div className={cn("flex flex-col items-center", spacing, className)}>
        <ActionButton icon={icons.like} label="Like" count={metrics?.likes} />
        <ActionButton
          icon={icons.comment}
          label="Comment"
          count={metrics?.comments}
        />
        <ActionButton
          icon={icons.share}
          label="Share"
          count={metrics?.shares}
        />
        {icons.save && <ActionButton icon={icons.save} label="Save" />}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-between",
        isCompact ? "px-2 py-1.5" : "px-3 py-2",
        className,
      )}
    >
      <div className={cn("flex items-center", spacing)}>
        <ActionButton icon={icons.like} label="Like" count={metrics?.likes} />
        <ActionButton
          icon={icons.comment}
          label="Comment"
          count={metrics?.comments}
        />
        <ActionButton
          icon={icons.share}
          label="Share"
          count={metrics?.shares}
        />
      </div>
      {icons.save && (
        <div className="flex-shrink-0">
          <ActionButton icon={icons.save} label="Save" />
        </div>
      )}
    </div>
  );
}
