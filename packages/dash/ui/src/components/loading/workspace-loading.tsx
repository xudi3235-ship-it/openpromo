import { Skeleton } from "@openpromo/ui/components/skeleton";

/**
 * Consistent loading skeleton for workspace-related pages
 * Used across all workspace routes to prevent flickering
 */
export function WorkspaceLoading() {
  return (
    <div className="flex h-full w-full flex-col gap-4 p-4">
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="flex-1 w-full" />
    </div>
  );
}
