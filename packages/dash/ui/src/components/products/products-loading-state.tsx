import { Skeleton } from "@openpromo/ui/components/skeleton";

export function ProductsLoadingState() {
  return (
    <div className="flex w-full flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Loading your catalog so it’s available inside Composer and the Image
        Generator…
      </p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {Array.from({ length: 12 }).map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholders only
          <div key={i} className="flex flex-col gap-3">
            <div className="relative aspect-[3/4] overflow-hidden rounded-xl border border-border/60 bg-background shadow-sm">
              <div className="flex h-full flex-col">
                <div className="relative flex-1">
                  <Skeleton className="absolute inset-0 h-full w-full" />

                  <div className="absolute left-3 top-3 z-10 flex flex-wrap items-center gap-2">
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-5 w-20 rounded-full" />
                  </div>

                  <div className="absolute right-3 top-3 z-10 flex items-center gap-2">
                    <Skeleton className="h-5 w-14 rounded-full" />
                    <Skeleton className="h-7 w-7 rounded-full" />
                  </div>
                </div>

                <div className="space-y-2 border-t border-border/60 bg-background/80 p-4">
                  <Skeleton className="h-5 w-3/4 rounded" />
                  <Skeleton className="h-4 w-full rounded" />
                  <div className="flex flex-wrap gap-2">
                    <Skeleton className="h-4 w-16 rounded-full" />
                    <Skeleton className="h-4 w-14 rounded-full" />
                    <Skeleton className="h-4 w-12 rounded-full" />
                  </div>
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <Skeleton className="h-4 w-24 rounded" />
                    <Skeleton className="h-4 w-16 rounded" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
