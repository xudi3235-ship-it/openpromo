/**
 * DataGrid Component Usage Examples
 *
 * The DataGrid component is a flexible, reusable grid for displaying collections of items
 * with support for:
 * - Dynamic column count (with optional slider control)
 * - Loading, empty, and error states
 * - Batch selection and actions
 * - Custom renderers for full flexibility
 */

import { useState } from "react";
import { DataGrid } from "@/components/common";

// ============================================================================
// Example 1: Simple product grid (like ProductVisuals)
// ============================================================================

interface Product {
  id: string;
  name: string;
  imageUrl: string;
}

export function ProductGridExample({
  products,
  isLoading,
  onDelete,
}: {
  products: Product[];
  isLoading: boolean;
  onDelete: (id: string) => void;
}) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  return (
    <DataGrid<Product>
      items={products}
      isLoading={isLoading}
      isEmpty={products.length === 0}
      renderItem={(product) => (
        <div className="rounded-lg border p-3 space-y-2">
          <img
            src={product.imageUrl}
            alt={product.name}
            className="aspect-square w-full object-cover rounded"
          />
          <p className="text-sm font-medium truncate">{product.name}</p>
        </div>
      )}
      header={{
        title: "Products",
        description: "Browse your product catalog",
      }}
      showColumnControl={true}
      defaultColumns={4}
      selectedCount={selectedIds.size}
      showSelectAllBtn={true}
      onSelectAllToggle={() => {
        if (selectedIds.size === products.length) {
          setSelectedIds(new Set());
        } else {
          setSelectedIds(new Set(products.map((p) => p.id)));
        }
      }}
      batchActions={[
        {
          label: "Delete Selected",
          variant: "destructive",
          onClick: () => {
            selectedIds.forEach(onDelete);
            setSelectedIds(new Set());
          },
        },
      ]}
    />
  );
}

// ============================================================================
// Example 2: Styles grid (simple, no header)
// ============================================================================

interface Style {
  id: string;
  name: string;
  previewUrl: string;
}

export function StylesGridExample({ styles }: { styles: Style[] }) {
  return (
    <DataGrid<Style>
      items={styles}
      isEmpty={styles.length === 0}
      renderItem={(style) => (
        <button className="group relative rounded-lg overflow-hidden hover:shadow-md transition-shadow">
          <img
            src={style.previewUrl}
            alt={style.name}
            className="aspect-square w-full object-cover"
          />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <span className="text-white text-sm font-medium">
              Use This Style
            </span>
          </div>
        </button>
      )}
      showColumnControl={false}
      defaultColumns={6}
      gridClassName="grid gap-2"
      contentClassName="space-y-2 p-2"
    />
  );
}

// ============================================================================
// Example 3: Custom empty state and error handling
// ============================================================================

export function CustomStateGridExample<T>({
  items,
  isLoading,
  error,
}: {
  items: T[];
  isLoading: boolean;
  error?: unknown;
}) {
  return (
    <DataGrid<T>
      items={items}
      isLoading={isLoading}
      error={error}
      isEmpty={items.length === 0}
      renderItem={(item) => <div>{JSON.stringify(item)}</div>}
      renderEmpty={() => (
        <div className="flex flex-col items-center gap-3 py-12">
          <span className="text-4xl">📭</span>
          <p className="text-center">
            <strong>Nothing here yet!</strong>
            <br />
            <span className="text-sm text-muted-foreground">
              Try adding some items to get started.
            </span>
          </p>
        </div>
      )}
      renderError={(err) => (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center text-red-700">
          <p className="font-medium">Oops! Something went wrong</p>
          <p className="text-sm">
            {err instanceof Error ? err.message : "Unknown error"}
          </p>
        </div>
      )}
    />
  );
}

// ============================================================================
// Key Props Reference
// ============================================================================

/**
 * DataGridProps<T>:
 *
 * REQUIRED:
 * - items: T[] - The array of items to render
 * - renderItem: (item: T) => ReactNode - Function to render each item
 *
 * OPTIONAL (Data):
 * - isLoading?: boolean - Show loading skeletons
 * - isEmpty?: boolean - Show empty state
 * - error?: unknown - Show error state
 *
 * OPTIONAL (Rendering):
 * - renderLoadingSkeleton?: () => ReactNode - Custom loading skeleton
 * - renderEmpty?: () => ReactNode - Custom empty state
 * - renderError?: (error: unknown) => ReactNode - Custom error state
 *
 * OPTIONAL (Header & Controls):
 * - header?: { title: string, description?: string } - Header with title/description
 * - showColumnControl?: boolean - Show column count slider (default: true)
 * - minColumns?: number - Minimum columns (default: 2)
 * - maxColumns?: number - Maximum columns (default: 6)
 * - defaultColumns?: number - Initial column count (default: 4)
 * - columnStep?: number - Column adjustment step (default: 2)
 *
 * OPTIONAL (Selection & Batch Actions):
 * - selectedCount?: number - Number of selected items
 * - showSelectAllBtn?: boolean - Show select/deselect all button
 * - onSelectAllToggle?: () => void - Callback for select all button
 * - batchActions?: DataGridBatchAction[] - Array of batch action buttons
 *
 * OPTIONAL (Styling):
 * - className?: string - Container class (default: flex with border/bg-white)
 * - gridClassName?: string - Grid wrapper class (default: "grid gap-3")
 * - contentClassName?: string - Content wrapper class (default: "space-y-4 p-4")
 * - skeletonCount?: number - Number of skeleton items to show (default: 6)
 */
