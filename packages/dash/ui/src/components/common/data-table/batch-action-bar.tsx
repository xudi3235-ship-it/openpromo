import { Button } from "@openpromo/ui/components/button";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export interface BatchAction {
  /** Unique key for the action */
  key: string;
  /** Label for the action button */
  label: string;
  /** Action handler */
  onClick: () => void;
  /** Optional icon */
  icon?: LucideIcon;
  /** Button variant */
  variant?: "default" | "destructive" | "outline" | "ghost";
  /** Disabled state */
  disabled?: boolean;
}

export interface BatchActionBarProps {
  /** Number of selected items */
  selectedCount: number;
  /** Total number of items */
  totalCount: number;
  /** Batch actions to display */
  actions: BatchAction[];
  /** Show select/deselect all toggle */
  showSelectAllToggle?: boolean;
  /** Select all handler */
  onSelectAll?: () => void;
  /** Deselect all handler */
  onDeselectAll?: () => void;
  /** Custom content to display */
  children?: ReactNode;
  /** Custom className */
  className?: string;
}

/**
 * BatchActionBar - Selection toolbar with bulk actions
 *
 * A toolbar component that appears when items are selected in a table or grid,
 * displaying selection count and batch action buttons.
 *
 * @example
 * ```tsx
 * <BatchActionBar
 *   selectedCount={5}
 *   totalCount={20}
 *   actions={[
 *     { key: 'delete', label: 'Delete', onClick: handleDelete, variant: 'destructive' },
 *     { key: 'export', label: 'Export', onClick: handleExport }
 *   ]}
 *   showSelectAllToggle
 *   onSelectAll={handleSelectAll}
 *   onDeselectAll={handleDeselectAll}
 * />
 * ```
 */
export function BatchActionBar({
  selectedCount,
  totalCount,
  actions,
  showSelectAllToggle = true,
  onSelectAll,
  onDeselectAll,
  children,
  className = "",
}: BatchActionBarProps) {
  if (selectedCount === 0) return null;

  const allSelected = selectedCount === totalCount;

  return (
    <div
      className={`flex flex-wrap items-center gap-2 px-4 py-3 bg-muted/50 border-b ${className}`}
    >
      {/* Selection count */}
      <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
        {selectedCount} of {totalCount} selected
      </span>

      {/* Select/Deselect all toggle */}
      {showSelectAllToggle && (onSelectAll || onDeselectAll) && (
        <Button
          variant="ghost"
          size="sm"
          onClick={allSelected ? onDeselectAll : onSelectAll}
          className="h-7 text-xs"
        >
          {allSelected ? "Deselect all" : "Select all"}
        </Button>
      )}

      {/* Batch actions */}
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <Button
            key={action.key}
            variant={action.variant || "ghost"}
            size="sm"
            onClick={action.onClick}
            disabled={action.disabled}
            className="h-7 text-xs gap-1"
          >
            {Icon && <Icon className="h-3 w-3" />}
            {action.label}
          </Button>
        );
      })}

      {/* Custom content */}
      {children}
    </div>
  );
}
