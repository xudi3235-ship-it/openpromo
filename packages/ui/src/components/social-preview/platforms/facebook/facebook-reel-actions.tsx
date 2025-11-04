import { Button } from "@openpromo/ui/components/button";
import { cn } from "@openpromo/ui/lib/utils";
import { Bookmark, Heart, MessageCircle, MoreHorizontal } from "lucide-react";
import type { BasePreviewProps } from "../../types";

export interface FacebookReelActionsProps extends BasePreviewProps {
  likes?: number;
  comments?: number;
  shares?: number;
  /** Custom share icon component */
  ShareIcon?: React.ComponentType<{ className?: string }>;
}

export function FacebookReelActions({
  size = "default",
  likes,
  comments,
  shares,
  ShareIcon = MessageCircle,
}: FacebookReelActionsProps) {
  const isCompact = size === "thumbnail" || size === "compact";

  const formatCount = (count?: number) => {
    if (!count) return "";
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const buttonSize = isCompact ? "h-8 w-8" : "h-10 w-10";
  const iconSize = isCompact ? "w-5 h-5" : "w-6 h-6";
  const textSize = isCompact ? "text-[9px]" : "text-[10px]";

  return (
    <div
      className={cn(
        "absolute flex flex-col items-center text-white z-10",
        isCompact
          ? "right-2 bottom-12 space-y-1.5"
          : "right-3 bottom-16 space-y-2",
      )}
    >
      {/* Like */}
      <div className="flex flex-col items-center">
        <Button
          variant="ghost"
          size="sm"
          className={cn("p-0 hover:bg-transparent", buttonSize)}
        >
          <Heart className={cn(iconSize, "text-white")} />
        </Button>
        {likes !== undefined && (
          <span className={cn("font-semibold mt-0.5", textSize)}>
            {formatCount(likes)}
          </span>
        )}
      </div>

      {/* Comment */}
      <div className="flex flex-col items-center">
        <Button
          variant="ghost"
          size="sm"
          className={cn("p-0 hover:bg-transparent", buttonSize)}
        >
          <MessageCircle className={cn(iconSize, "text-white")} />
        </Button>
        {comments !== undefined && (
          <span className={cn("font-semibold mt-0.5", textSize)}>
            {formatCount(comments)}
          </span>
        )}
      </div>

      {/* Share */}
      <div className="flex flex-col items-center">
        <Button
          variant="ghost"
          size="sm"
          className={cn("p-0 hover:bg-transparent", buttonSize)}
        >
          <ShareIcon className={cn(iconSize, "text-white")} />
        </Button>
        {shares !== undefined && (
          <span className={cn("font-semibold mt-0.5", textSize)}>
            {formatCount(shares)}
          </span>
        )}
      </div>

      {/* Save */}
      <div className="flex flex-col items-center">
        <Button
          variant="ghost"
          size="sm"
          className={cn("p-0 hover:bg-transparent", buttonSize)}
        >
          <Bookmark className={cn(iconSize, "text-white")} />
        </Button>
      </div>

      {/* More */}
      <div className="flex flex-col items-center">
        <Button
          variant="ghost"
          size="sm"
          className={cn("p-0 hover:bg-transparent", buttonSize)}
        >
          <MoreHorizontal className={cn(iconSize, "text-white")} />
        </Button>
      </div>
    </div>
  );
}
