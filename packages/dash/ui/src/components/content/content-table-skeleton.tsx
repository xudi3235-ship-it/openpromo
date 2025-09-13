import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@openpromo/ui/components/table";

interface ContentTableSkeletonProps {
  rows?: number;
  columns?: number;
}

export function ContentTableSkeleton({
  rows = 6,
  columns = 6,
}: ContentTableSkeletonProps) {
  return (
    <div className="overflow-hidden rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            {[...Array(columns)].map((_, index) => (
              <TableHead
                // biome-ignore lint/suspicious/noArrayIndexKey: Static skeleton headers
                key={index}
                className={
                  index === 0 ? "w-12" : index === columns - 1 ? "w-20" : ""
                }
              >
                <div
                  className={`h-4 bg-muted animate-pulse rounded ${
                    index === 0
                      ? "w-4"
                      : index === 1
                        ? "w-16"
                        : index === columns - 1
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
              {[...Array(columns)].map((_, colIndex) => (
                <TableCell
                  // biome-ignore lint/suspicious/noArrayIndexKey: Static skeleton cells
                  key={colIndex}
                >
                  {colIndex === 0 ? (
                    // Checkbox column
                    <div className="h-6 w-6 bg-muted animate-pulse rounded" />
                  ) : colIndex === 1 ? (
                    // Title column
                    <div className="space-y-3">
                      <div className="h-5 bg-muted animate-pulse rounded w-48" />
                      <div className="h-4 bg-muted/60 animate-pulse rounded w-36" />
                    </div>
                  ) : colIndex === 2 ? (
                    // Platform column
                    <div className="flex gap-2">
                      <div className="h-8 w-8 bg-muted animate-pulse rounded" />
                      <div className="h-8 w-8 bg-muted animate-pulse rounded" />
                    </div>
                  ) : colIndex === 3 ? (
                    // Status column
                    <div className="h-8 bg-muted animate-pulse rounded w-24" />
                  ) : colIndex === 4 ? (
                    // Date column
                    <div className="h-5 bg-muted animate-pulse rounded w-28" />
                  ) : colIndex === columns - 1 ? (
                    // Actions column (last column)
                    <div className="flex gap-2">
                      <div className="h-10 w-10 bg-muted animate-pulse rounded" />
                      <div className="h-10 w-10 bg-muted animate-pulse rounded" />
                    </div>
                  ) : (
                    // Generic column
                    <div className="h-6 bg-muted animate-pulse rounded w-20" />
                  )}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
