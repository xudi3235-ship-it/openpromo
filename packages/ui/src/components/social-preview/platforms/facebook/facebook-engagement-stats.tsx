import { cn } from "@openpromo/ui/lib/utils";
import { Heart, ThumbsUp } from "lucide-react";
import type { BasePreviewProps } from "../../types";

export interface FacebookEngagementStatsProps extends BasePreviewProps {
  likes?: number;
  comments?: number;
  shares?: number;
}

export function FacebookEngagementStats({
  likes = 142,
  comments = 23,
  shares = 8,
  size = "default",
}: FacebookEngagementStatsProps) {
  const isCompact = size === "thumbnail" || size === "compact";
  const spacing = isCompact ? "px-2 py-1.5" : "px-3 py-2";
  const textSize = isCompact ? "text-[10px]" : "text-xs";

  return (
    <div
      className={cn(
        "flex items-center justify-between text-muted-foreground",
        spacing,
        textSize,
      )}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <div className="flex items-center gap-1 min-w-0">
          <div className="flex -space-x-1 flex-shrink-0">
            <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
              <ThumbsUp className="w-2 h-2 text-white fill-white" />
            </div>
            <div className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center">
              <Heart className="w-2 h-2 text-white fill-white" />
            </div>
          </div>
          <span className="truncate">{likes} reactions</span>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="whitespace-nowrap">{comments} comments</span>
        <span className="whitespace-nowrap">{shares} shares</span>
      </div>
    </div>
  );
}
