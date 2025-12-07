/** biome-ignore-all lint/suspicious/noArrayIndexKey: ok */
import { Skeleton } from "@openpromo/ui/components/skeleton";

export function ProductsLoadingState() {
  return (
    <div className="flex w-full flex-col gap-4">
      <p className="text-sm text-muted-foreground">Loading your products…</p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {Array.from({ length: 10 }).map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholders only
          <div
            key={i}
            className="aspect-square overflow-hidden rounded-lg border border-border bg-muted/30"
          >
            <Skeleton className="h-full w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
