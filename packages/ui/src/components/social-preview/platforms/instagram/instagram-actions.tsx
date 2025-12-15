import { Button } from "@openpromo/ui/components/button";
import { cn } from "@openpromo/ui/lib/utils";
import { Bookmark, Heart, MessageCircle, Send } from "lucide-react";
import type { BasePreviewProps } from "../../types";

export interface InstagramActionsProps extends BasePreviewProps {}

export function InstagramActions({ size = "default" }: InstagramActionsProps) {
  const isCompact = size === "thumbnail" || size === "compact";
  const spacing = isCompact ? "p-2" : "p-3";
  const iconSize = isCompact ? "w-5 h-5" : "w-6 h-6";

  return (
    <div className={cn("flex items-center justify-between", spacing)}>
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          className="p-0 hover:text-muted-foreground"
        >
          <Heart className={iconSize} />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="p-0 hover:text-muted-foreground"
        >
          <MessageCircle className={iconSize} />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="p-0 hover:text-muted-foreground"
        >
          <Send className={iconSize} />
        </Button>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="p-0 hover:text-muted-foreground"
      >
        <Bookmark className={iconSize} />
      </Button>
    </div>
  );
}
