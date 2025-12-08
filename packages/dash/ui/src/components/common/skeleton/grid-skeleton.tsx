import { Skeleton } from "@openpromo/ui/components/skeleton";

export interface GridSkeletonProps {
  /** Number of items to display */
  items?: number;
  /** Number of columns in the grid */
  columns?: 1 | 2 | 3 | 4 | 5 | 6;
  /** Aspect ratio for the skeleton items */
  aspectRatio?: "square" | "video" | "portrait";
  /** Show title skeleton below items */
  showTitle?: boolean;
  /** Show subtitle skeleton below title */
  showSubtitle?: boolean;
  /** Custom className for the container */
  className?: string;
}

const gridColsMap: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
  5: "grid-cols-5",
  6: "grid-cols-6",
};

const aspectRatioMap: Record<string, string> = {
  square: "aspect-square",
  video: "aspect-video",
  portrait: "aspect-[3/4]",
};

/**
 * GridSkeleton - Configurable grid loading state
 *
 * A flexible skeleton component for grid views with customizable columns,
 * aspect ratios, and metadata displays.
 *
 * @example
 * ```tsx
 * <GridSkeleton items={8} columns={4} aspectRatio="square" showTitle showSubtitle />
 * ```
 */
export function GridSkeleton({
  items = 6,
  columns = 4,
  aspectRatio = "square",
  showTitle = true,
  showSubtitle = true,
  className = "",
}: GridSkeletonProps) {
  return (
    <div className={`grid gap-3 ${gridColsMap[columns]} ${className}`}>
      {[...Array(items)].map((_, i) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: Static skeleton items
          key={i}
          className="space-y-2"
        >
          <Skeleton
            className={`w-full rounded-md ${aspectRatioMap[aspectRatio]}`}
          />
          {showTitle && <Skeleton className="h-4 w-2/3" />}
          {showSubtitle && <Skeleton className="h-3 w-1/2" />}
        </div>
      ))}
    </div>
  );
}
