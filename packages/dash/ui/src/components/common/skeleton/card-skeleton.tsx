import { Skeleton } from "@openpromo/ui/components/skeleton";

export interface CardSkeletonProps {
  /** Show header section */
  showHeader?: boolean;
  /** Show media/image section */
  showMedia?: boolean;
  /** Aspect ratio for media section */
  mediaAspectRatio?: "square" | "video" | "portrait";
  /** Show footer section */
  showFooter?: boolean;
  /** Number of content lines */
  contentLines?: number;
  /** Custom className for the card */
  className?: string;
}

const aspectRatioMap: Record<string, string> = {
  square: "aspect-square",
  video: "aspect-video",
  portrait: "aspect-[3/4]",
};

/**
 * CardSkeleton - Generic card loading state
 *
 * A flexible skeleton component for card layouts with optional header,
 * media, content, and footer sections.
 *
 * @example
 * ```tsx
 * <CardSkeleton showHeader showMedia showFooter contentLines={3} />
 * ```
 */
export function CardSkeleton({
  showHeader = true,
  showMedia = true,
  mediaAspectRatio = "square",
  showFooter = true,
  contentLines = 2,
  className = "",
}: CardSkeletonProps) {
  return (
    <div className={`rounded-lg border bg-card p-4 space-y-4 ${className}`}>
      {/* Header */}
      {showHeader && (
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/4" />
          </div>
        </div>
      )}

      {/* Media */}
      {showMedia && (
        <Skeleton
          className={`w-full rounded-md ${aspectRatioMap[mediaAspectRatio]}`}
        />
      )}

      {/* Content lines */}
      {contentLines > 0 && (
        <div className="space-y-2">
          {[...Array(contentLines)].map((_, i) => (
            <Skeleton
              // biome-ignore lint/suspicious/noArrayIndexKey: Static skeleton lines
              key={i}
              className={`h-4 ${i === contentLines - 1 ? "w-2/3" : "w-full"}`}
            />
          ))}
        </div>
      )}

      {/* Footer */}
      {showFooter && (
        <div className="flex items-center gap-4">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-16" />
        </div>
      )}
    </div>
  );
}
