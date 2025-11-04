import { Button } from "@openpromo/ui/components/button";
import { cn } from "@openpromo/ui/lib/utils";
import { MessageCircle, Share, ThumbsUp } from "lucide-react";
import type { BasePreviewProps } from "../../types";

export interface FacebookActionsProps extends BasePreviewProps {}

export function FacebookActions({ size = "default" }: FacebookActionsProps) {
  const isCompact = size === "thumbnail" || size === "compact";
  const spacing = isCompact ? "px-2 py-2" : "px-3 py-3";
  const iconSize = isCompact ? "w-3.5 h-3.5" : "w-4 h-4";

  return (
    <div className={cn("flex items-center border-t", spacing)}>
      <Button
        variant="ghost"
        size="sm"
        className="flex-1 text-muted-foreground hover:text-foreground h-auto py-1"
      >
        <ThumbsUp className={cn(iconSize, "mr-1")} />
        <span className="truncate text-xs">Like</span>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="flex-1 text-muted-foreground hover:text-foreground h-auto py-1"
      >
        <MessageCircle className={cn(iconSize, "mr-1")} />
        <span className="truncate text-xs">Comment</span>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="flex-1 text-muted-foreground hover:text-foreground h-auto py-1"
      >
        <Share className={cn(iconSize, "mr-1")} />
        <span className="truncate text-xs">Share</span>
      </Button>
    </div>
  );
}
