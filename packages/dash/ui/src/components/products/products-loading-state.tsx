import { Skeleton } from "@openpromo/ui/components/skeleton";

export function ProductsLoadingState() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: ok
          key={i}
          className="rounded-xl border border-border/60 bg-background/80 p-3 shadow-none"
        >
          <Skeleton className="aspect-square w-full rounded-lg" />
          <div className="mt-3 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <div className="flex gap-2">
              <Skeleton className="h-4 w-12 rounded-full" />
              <Skeleton className="h-4 w-10 rounded-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
