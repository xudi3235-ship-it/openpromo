import { Skeleton } from "@openpromo/ui/components/skeleton";
import { Surface } from "@openpromo/ui/components/surface";

export function ContentDetailSkeleton() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <Surface padded="lg">
        <div className="flex flex-col gap-4 md:flex-row">
          <Skeleton className="h-48 w-full rounded-3xl md:w-60" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-6 w-40 rounded-full" />
            <Skeleton className="h-12 w-full rounded-2xl" />
            <Skeleton className="h-4 w-3/4 rounded-full" />
          </div>
        </div>
      </Surface>
      <Surface padded="lg">
        <Skeleton className="h-8 w-56 rounded-full" />
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {["metrics-a", "metrics-b", "metrics-c"].map((slot) => (
            <Skeleton key={slot} className="h-24 w-full rounded-2xl" />
          ))}
        </div>
      </Surface>
      <Surface padded="lg">
        <Skeleton className="h-8 w-40 rounded-full" />
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {["media-a", "media-b"].map((slot) => (
            <Skeleton key={slot} className="h-40 w-full rounded-2xl" />
          ))}
        </div>
      </Surface>
      <Surface padded="lg">
        <Skeleton className="h-8 w-40 rounded-full" />
        <div className="mt-4 flex flex-wrap gap-3">
          <Skeleton className="h-10 w-28 rounded-full" />
          <Skeleton className="h-10 w-32 rounded-full" />
        </div>
      </Surface>
    </div>
  );
}
