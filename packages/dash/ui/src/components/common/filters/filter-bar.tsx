import { Button } from "@openpromo/ui/components/button";
import { X } from "lucide-react";
import type { ReactNode } from "react";

export interface FilterBarProps {
  /** Filter components to display */
  children: ReactNode;
  /** Whether filters are active */
  hasActiveFilters?: boolean;
  /** Clear filters handler */
  onClearFilters?: () => void;
  /** Custom className */
  className?: string;
}

/**
 * FilterBar - Container for filter components
 *
 * A consistent layout container for filter controls with automatic
 * "Clear filters" button when filters are active.
 *
 * @example
 * ```tsx
 * <FilterBar hasActiveFilters={hasFilters} onClearFilters={clearFilters}>
 *   <FilterSelect ... />
 *   <FilterDateRange ... />
 * </FilterBar>
 * ```
 */
export function FilterBar({
  children,
  hasActiveFilters = false,
  onClearFilters,
  className = "",
}: FilterBarProps) {
  return (
    <div className={`flex items-center gap-2 mb-2 ${className}`}>
      {children}

      {/* Clear Filters Button */}
      {hasActiveFilters && onClearFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearFilters}
          className="text-muted-foreground hover:text-foreground h-9 px-3"
        >
          <X className="h-4 w-4 mr-1" />
          Clear
        </Button>
      )}
    </div>
  );
}
