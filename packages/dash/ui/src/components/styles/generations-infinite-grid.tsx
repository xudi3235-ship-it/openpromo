import { Button } from "@openpromo/ui/components/button";
import { Skeleton } from "@openpromo/ui/components/skeleton";
import { Sparkles } from "lucide-react";
import { useEffect } from "react";
import { useIntersectionObserver } from "usehooks-ts";
import { useStyleGenerationsInfiniteQuery } from "@/queries/styles";
import { GenerationCard } from "./generation-card";

interface GenerationsInfiniteGridProps {
  styleId: string;
  styleName: string;
  onGenerateClick?: () => void;
}

export function GenerationsInfiniteGrid({
  styleId,
  styleName,
  onGenerateClick,
}: GenerationsInfiniteGridProps) {
  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useStyleGenerationsInfiniteQuery(styleId, { pageSize: "12" });

  const { ref: loadMoreRef, isIntersecting } = useIntersectionObserver({
    threshold: 0.1,
    rootMargin: "100px",
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies: fetchNextPage is stable
  useEffect(() => {
    if (isIntersecting && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [isIntersecting, hasNextPage, isFetchingNextPage]);

  const allGenerations = data?.pages.flatMap((page) => page.generations) ?? [];
  const totalCount = data?.pages[0]?.pagination.total ?? 0;

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton
            // biome-ignore lint/suspicious/noArrayIndexKey: placeholder list
            key={index}
            className="mx-auto aspect-[3/4] w-full max-w-xs rounded-lg"
          />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-center text-sm text-destructive">
        Failed to load generated images.
      </div>
    );
  }

  if (allGenerations.length === 0) {
    return (
      <Button
        variant="outline"
        className="group relative h-auto w-full flex-col gap-3 overflow-hidden rounded-lg border-2 border-dashed border-border/60 bg-muted/20 p-8 transition-all hover:border-primary/40 hover:bg-muted/40"
        onClick={onGenerateClick}
      >
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 transition-transform group-hover:scale-110">
          <Sparkles className="h-8 w-8 text-primary" />
        </div>
        <div className="space-y-1 text-center">
          <p className="font-semibold text-foreground">
            Generate Your First Asset
          </p>
          <p className="text-xs text-muted-foreground">
            Use this style to create stunning visuals
          </p>
        </div>
      </Button>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {allGenerations.map((generation) => (
          <GenerationCard
            key={generation.id}
            generation={generation}
            styleName={styleName}
          />
        ))}
      </div>

      {/* Load More Trigger */}
      {hasNextPage && (
        <div ref={loadMoreRef} className="py-2">
          {isFetchingNextPage && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton
                  // biome-ignore lint/suspicious/noArrayIndexKey: placeholder list
                  key={index}
                  className="mx-auto aspect-[3/4] w-full max-w-xs rounded-lg"
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Show total count when scrolled */}
      {!hasNextPage && allGenerations.length > 0 && (
        <div className="py-2 text-center text-xs text-muted-foreground">
          Showing all {totalCount} generation{totalCount !== 1 ? "s" : ""}
        </div>
      )}
    </div>
  );
}
