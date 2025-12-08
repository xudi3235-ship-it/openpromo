import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@openpromo/ui/components/table";

export interface TableSkeletonProps {
  /** Number of rows to display */
  rows?: number;
  /** Number of columns to display */
  columns?: number;
  /** Show checkbox column (first column) */
  showCheckbox?: boolean;
  /** Show actions column (last column) */
  showActions?: boolean;
  /** Custom className for the wrapper */
  className?: string;
}

/**
 * TableSkeleton - Configurable table loading state
 *
 * A flexible skeleton component for table views with customizable rows,
 * columns, and special column types (checkbox, actions).
 *
 * @example
 * ```tsx
 * <TableSkeleton rows={10} columns={5} showCheckbox showActions />
 * ```
 */
export function TableSkeleton({
  rows = 6,
  columns = 6,
  showCheckbox = true,
  showActions = true,
  className = "",
}: TableSkeletonProps) {
  const totalColumns = columns + (showCheckbox ? 1 : 0) + (showActions ? 1 : 0);
  const checkboxColIndex = showCheckbox ? 0 : -1;
  const actionsColIndex = showActions ? totalColumns - 1 : -1;

  const renderCell = (colIndex: number) => {
    // Checkbox column
    if (colIndex === checkboxColIndex) {
      return <div className="h-6 w-6 bg-muted animate-pulse rounded" />;
    }

    // Actions column
    if (colIndex === actionsColIndex) {
      return (
        <div className="flex gap-2">
          <div className="h-10 w-10 bg-muted animate-pulse rounded" />
        </div>
      );
    }

    // First content column (usually title/name)
    if (colIndex === (showCheckbox ? 1 : 0)) {
      return (
        <div className="space-y-3">
          <div className="h-5 bg-muted animate-pulse rounded w-48" />
          <div className="h-4 bg-muted/60 animate-pulse rounded w-36" />
        </div>
      );
    }

    // Regular columns
    return <div className="h-6 bg-muted animate-pulse rounded w-20" />;
  };

  return (
    <div className={`overflow-hidden rounded-md border ${className}`}>
      <Table>
        <TableHeader>
          <TableRow>
            {[...Array(totalColumns)].map((_, index) => (
              <TableHead
                // biome-ignore lint/suspicious/noArrayIndexKey: Static skeleton headers
                key={index}
                className={
                  index === checkboxColIndex
                    ? "w-12"
                    : index === actionsColIndex
                      ? "w-20"
                      : ""
                }
              >
                <div
                  className={`h-4 bg-muted animate-pulse rounded ${
                    index === checkboxColIndex
                      ? "w-4"
                      : index === (showCheckbox ? 1 : 0)
                        ? "w-16"
                        : index === actionsColIndex
                          ? "w-12"
                          : "w-20"
                  }`}
                />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {[...Array(rows)].map((_, rowIndex) => (
            <TableRow
              // biome-ignore lint/suspicious/noArrayIndexKey: Static skeleton rows
              key={rowIndex}
              className="h-20"
            >
              {[...Array(totalColumns)].map((_, colIndex) => (
                <TableCell
                  // biome-ignore lint/suspicious/noArrayIndexKey: Static skeleton cells
                  key={colIndex}
                >
                  {renderCell(colIndex)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
