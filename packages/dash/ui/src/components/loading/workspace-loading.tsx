import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
} from "@openpromo/ui/components/sidebar";
import { Skeleton } from "@openpromo/ui/components/skeleton";
import { cn } from "@openpromo/ui/lib/utils";

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

/**
 * Full workspace layout loading skeleton with sidebar
 * Shows the complete layout structure while workspace data loads
 */
export function WorkspaceLayoutLoading() {
  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader className="p-4">
          <Skeleton className="h-10 w-full" />
        </SidebarHeader>
        <SidebarContent className="px-2 py-2">
          <div className="space-y-6">
            {/* Core nav group */}
            <div className="space-y-1">
              <Skeleton className="h-3 w-16 mb-2" />
              {Array.from({ length: 7 }).map((_, i) => (
                <div
                  // biome-ignore lint/suspicious/noArrayIndexKey: static loading skeleton
                  key={`core-${i}`}
                  className="flex items-center gap-3 px-2 py-2"
                >
                  <Skeleton className="h-4 w-4 shrink-0" />
                  <Skeleton className="h-4 flex-1" />
                </div>
              ))}
            </div>
            {/* Growth nav group */}
            <div className="space-y-1">
              <Skeleton className="h-3 w-16 mb-2" />
              {Array.from({ length: 2 }).map((_, i) => (
                <div
                  // biome-ignore lint/suspicious/noArrayIndexKey: static loading skeleton
                  key={`growth-${i}`}
                  className="flex items-center gap-3 px-2 py-2"
                >
                  <Skeleton className="h-4 w-4 shrink-0" />
                  <Skeleton className="h-4 flex-1" />
                </div>
              ))}
            </div>
          </div>
        </SidebarContent>
        <SidebarFooter className="p-4">
          <Skeleton className="h-10 w-full" />
        </SidebarFooter>
      </Sidebar>
      <SidebarInset
        className={cn(
          "has-[[data-layout=fixed]]:h-svh",
          "peer-data-[variant=inset]:has-[[data-layout=fixed]]:h-[calc(100svh-(var(--spacing)*4))]",
          "@container/content",
        )}
      >
        <div className="flex-1 min-h-0">
          <div className="flex h-full w-full flex-col gap-4 p-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="flex-1 w-full" />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
