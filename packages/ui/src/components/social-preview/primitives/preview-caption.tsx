import { cn } from "@openpromo/ui/lib/utils";
import type { BasePreviewProps } from "../types";

export interface PreviewCaptionProps extends BasePreviewProps {
  accountName?: string | null;
  caption?: string | null;
  /** Maximum number of lines before truncation */
  maxLines?: number;
  /** Whether to show "See more" link */
  showSeeMore?: boolean;
  /** Custom placeholder text */
  placeholder?: string;
}

export function PreviewCaption({
  accountName,
  caption,
  maxLines = 3,
  showSeeMore = false,
  placeholder = "Add a caption",
  size = "default",
  className,
}: PreviewCaptionProps) {
  const isCompact = size === "thumbnail" || size === "compact";
  const textSize = isCompact ? "text-xs" : "text-sm";
  const spacing = isCompact ? "px-2 py-1.5" : "px-3 py-2";

  const lineClamp = maxLines ? `line-clamp-${maxLines}` : "";

  return (
    <div className={cn(spacing, className)}>
      <div className={cn("leading-relaxed", textSize)}>
        {accountName && (
          <span className="font-semibold mr-1">{accountName}</span>
        )}
        <span
          className={cn("text-muted-foreground whitespace-pre-wrap", lineClamp)}
        >
          {caption || placeholder}
        </span>
      </div>
      {showSeeMore && caption && caption.length > 100 && (
        <button
          type="button"
          className={cn("text-muted-foreground hover:underline mt-1", textSize)}
        >
          See more
        </button>
      )}
    </div>
  );
}
