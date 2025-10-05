import { Card, CardContent, CardHeader } from "@openpromo/ui/components/card";
import { Skeleton } from "@openpromo/ui/components/skeleton";

export function ProductsLoadingState() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {Array.from({ length: 12 }).map((_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: later
        <Card key={i} className="overflow-hidden">
          <CardHeader className="p-0">
            <Skeleton className="aspect-square w-full" />
          </CardHeader>
          <CardContent className="p-2">
            <Skeleton className="h-4 w-3/4" />
            <div className="flex gap-0.5 mt-1">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-10" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
