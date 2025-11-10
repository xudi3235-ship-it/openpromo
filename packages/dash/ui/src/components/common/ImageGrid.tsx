import { cn } from "@openpromo/ui/lib/utils";
import type { ReactNode } from "react";

interface ImageGridProps {
  children: ReactNode;
  className?: string;
  /** Whether to use gap-0 (tight grid) or gap spacing */
  tight?: boolean;
  /** Column configuration for different breakpoints */
  cols?: {
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
}

/**
 * Reusable image grid component with consistent styling
 * Used for styles, products, and other image-based grids
 */
export function ImageGrid({
  children,
  className,
  tight = true,
  cols = { sm: 2, md: 3, lg: 4, xl: 5 },
}: ImageGridProps) {
  const gapClass = tight ? "gap-0" : "gap-3";

  const colClasses = [
    cols.sm && `grid-cols-${cols.sm}`,
    cols.md && `sm:grid-cols-${cols.md}`,
    cols.lg && `lg:grid-cols-${cols.lg}`,
    cols.xl && `xl:grid-cols-${cols.xl}`,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={cn("grid", gapClass, colClasses, className)}>
      {children}
    </div>
  );
}

interface ImageGridCardProps {
  children: ReactNode;
  onClick?: () => void;
  onKeyDown?: (event: React.KeyboardEvent<HTMLDivElement>) => void;
  className?: string;
  /** Whether to show borders */
  bordered?: boolean;
  /** Aspect ratio of the card */
  aspectRatio?: "square" | "portrait" | "landscape";
}

/**
 * Individual card component for use within ImageGrid
 */
export function ImageGridCard({
  children,
  onClick,
  onKeyDown,
  className,
  bordered = true,
  aspectRatio = "square",
}: ImageGridCardProps) {
  const aspectClass = {
    square: "aspect-square",
    portrait: "aspect-[3/4]",
    landscape: "aspect-[4/3]",
  }[aspectRatio];

  const borderClass = bordered
    ? "border border-gray-200 dark:border-gray-800"
    : "";

  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onKeyDown}
      className={cn(
        "group relative overflow-hidden transition-all duration-200",
        aspectClass,
        borderClass,
        onClick && "cursor-pointer hover:shadow-md",
        onClick &&
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      {children}
    </div>
  );
}
