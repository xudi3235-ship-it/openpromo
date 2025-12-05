import { Button } from "@openpromo/ui/components/button";
import { ScrollArea } from "@openpromo/ui/components/scroll-area";
import { Skeleton } from "@openpromo/ui/components/skeleton";
import { Slider } from "@openpromo/ui/components/slider";
import { ImageIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";

export interface DataGridHeader {
  title: string;
  description?: string;
}

export interface DataGridBatchAction {
  label: string;
  onClick: () => void;
  variant?: "default" | "destructive" | "ghost";
  disabled?: boolean;
}

export interface DataGridProps<T> {
  // Data
  items: T[];
  isLoading?: boolean;
  isEmpty?: boolean;
  error?: unknown;

  // Rendering
  renderItem: (item: T) => ReactNode;
  renderLoadingSkeleton?: () => ReactNode;
  renderEmpty?: () => ReactNode;
  renderError?: (error: unknown) => ReactNode;

  // Header
  header?: DataGridHeader;

  // Column control
  showColumnControl?: boolean;
  minColumns?: number;
  maxColumns?: number;
  defaultColumns?: number;
  columnStep?: number;

  // Selection / Batch actions
  selectedCount?: number;
  showSelectAllBtn?: boolean;
  onSelectAllToggle?: () => void;
  batchActions?: DataGridBatchAction[];

  // Styling
  className?: string;
  gridClassName?: string;
  contentClassName?: string;

  // Skeleton
  skeletonCount?: number;
}

const defaultGetGridClass = (cols: number) => {
  const gridClasses: Record<number, string> = {
    1: "grid-cols-1",
    2: "grid-cols-2",
    3: "grid-cols-3",
    4: "grid-cols-4",
    5: "grid-cols-5",
    6: "grid-cols-6",
  };
  return gridClasses[cols] || "grid-cols-4";
};

export function DataGrid<T>({
  items,
  isLoading = false,
  isEmpty = false,
  error,
  renderItem,
  renderLoadingSkeleton,
  renderEmpty,
  renderError,
  header,
  showColumnControl = true,
  minColumns = 2,
  maxColumns = 6,
  defaultColumns = 4,
  columnStep = 2,
  selectedCount = 0,
  showSelectAllBtn = false,
  onSelectAllToggle,
  batchActions,
  className = "flex flex-1 min-w-0 flex-col overflow-hidden rounded-lg border bg-white",
  gridClassName = "grid gap-3",
  contentClassName = "space-y-4 p-4",
  skeletonCount = 6,
}: DataGridProps<T>) {
  const [columnCount, setColumnCount] = useState(defaultColumns);

  const gridClass = useMemo(
    () => defaultGetGridClass(columnCount),
    [columnCount],
  );

  // Default renderers
  // Note: Using index as key for skeleton items is acceptable since they're temporary loading placeholders
  const renderLoadingState =
    renderLoadingSkeleton ??
    (() => (
      <div className={`${gridClassName} ${gridClass}`}>
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <div
            key={`skeleton-${
              // biome-ignore lint/suspicious/noArrayIndexKey: lib
              i
            }`}
            className="space-y-2"
          >
            <Skeleton className="aspect-square w-full rounded-md" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-2 w-3/4" />
          </div>
        ))}
      </div>
    ));

  const renderEmptyState =
    renderEmpty ??
    (() => (
      <div className="flex flex-col items-center justify-center text-center py-16 text-muted-foreground gap-2">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <ImageIcon className="h-5 w-5" />
        </div>
        <p className="text-sm font-medium">No items</p>
        <p className="text-xs text-muted-foreground">
          Start by adding items to see them here.
        </p>
      </div>
    ));

  const renderErrorState =
    renderError ??
    ((err: unknown) => (
      <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 text-center text-sm text-destructive">
        <p>Failed to load items.</p>
        <p className="text-xs opacity-80">
          {err instanceof Error ? err.message : "Unknown error"}
        </p>
      </div>
    ));

  // Render states
  if (error) {
    return (
      <section className={className}>
        <ScrollArea className="min-h-0 flex-1">
          <div className={contentClassName}>{renderErrorState(error)}</div>
        </ScrollArea>
      </section>
    );
  }

  if (isLoading) {
    return (
      <section className={className}>
        <ScrollArea className="min-h-0 flex-1">
          <div className={contentClassName}>{renderLoadingState()}</div>
        </ScrollArea>
      </section>
    );
  }

  if (isEmpty || items.length === 0) {
    return (
      <section className={className}>
        <ScrollArea className="min-h-0 flex-1">
          <div className={contentClassName}>{renderEmptyState()}</div>
        </ScrollArea>
      </section>
    );
  }

  return (
    <section className={className}>
      {/* Header with controls */}
      {(header || showColumnControl || selectedCount > 0 || batchActions) && (
        <div className="flex flex-col gap-3 border-b px-4 py-3 flex-shrink-0">
          {/* Title and slider */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            {header && (
              <div>
                <h4 className="text-sm font-medium">{header.title}</h4>
                {header.description && (
                  <p className="text-xs text-muted-foreground">
                    {header.description}
                  </p>
                )}
              </div>
            )}

            {/* Column control slider */}
            {showColumnControl && (
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {columnCount} cols
                </span>
                <Slider
                  value={[columnCount]}
                  onValueChange={(value) =>
                    setColumnCount(value[0] || defaultColumns)
                  }
                  min={minColumns}
                  max={maxColumns}
                  step={columnStep}
                  className="w-20"
                />
              </div>
            )}
          </div>

          {/* Batch actions */}
          {selectedCount > 0 && (batchActions || showSelectAllBtn) && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                {selectedCount} of {items.length} selected
              </span>

              {showSelectAllBtn && onSelectAllToggle && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onSelectAllToggle}
                  className="h-7 text-xs"
                >
                  {selectedCount === items.length
                    ? "Deselect all"
                    : "Select all"}
                </Button>
              )}

              {batchActions?.map((action) => (
                <Button
                  key={`batch-action-${action.label}`}
                  variant={action.variant || "ghost"}
                  size="sm"
                  onClick={action.onClick}
                  disabled={action.disabled}
                  className="h-7 text-xs"
                >
                  {action.label}
                </Button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Grid content */}
      <ScrollArea className="min-h-0 flex-1">
        <div className={contentClassName}>
          <div className={`${gridClassName} ${gridClass}`}>
            {items.map((item) => (
              <div key={JSON.stringify(item)}>{renderItem(item)}</div>
            ))}
          </div>
        </div>
      </ScrollArea>
    </section>
  );
}
