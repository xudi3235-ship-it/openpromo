import { Button } from "@openpromo/ui/components/button";
import { Skeleton } from "@openpromo/ui/components/skeleton";
import { cn } from "@openpromo/ui/lib/utils";
import { Plus, Search, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { Fragment, useEffect, useMemo } from "react";
import { useIntersectionObserver } from "usehooks-ts";
import {
  type StyleResponse,
  type StylesListParams,
  useStylesInfiniteQuery,
} from "@/queries/styles";
import { useStyleComposerStore } from "@/stores/style-composer-store";
import { StyleCard } from "./style-card";

type StyleItem = StyleResponse["style"];
type StylesQueryParams = Omit<StylesListParams, "page">;

interface StylesInfiniteGridProps {
  params?: StylesQueryParams;
  hasFilters?: boolean;
  className?: string;
  gridClassName?: string;
  /**
   * Number of skeleton cards to render while fetching the next page.
   * Initial loading uses a larger default count.
   */
  skeletonCount?: number;
  renderStyle?: (style: StyleItem) => ReactNode;
  renderEmpty?: (context: { hasFilters: boolean }) => ReactNode;
  renderLoading?: () => ReactNode;
  renderLoadMore?: () => ReactNode;
  renderError?: (error: unknown) => ReactNode;
  observerRootMargin?: string;
  observerThreshold?: number | number[];
}

export function StylesInfiniteGrid({
  params,
  hasFilters,
  className,
  gridClassName,
  skeletonCount = 5,
  renderStyle,
  renderEmpty,
  renderLoading,
  renderLoadMore,
  renderError,
  observerRootMargin = "100px",
  observerThreshold = 0.1,
}: StylesInfiniteGridProps) {
  const queryParams = params ?? {};

  const computedHasFilters =
    hasFilters ??
    Object.values(queryParams).some((value) => {
      if (value == null) {
        return false;
      }
      if (typeof value === "string") {
        return value.trim().length > 0;
      }
      return true;
    });

  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useStylesInfiniteQuery(queryParams);

  const styles = useMemo(
    () => data?.pages.flatMap((page) => page.styles) ?? [],
    [data],
  );

  const { isIntersecting, ref: observerRef } = useIntersectionObserver({
    threshold: observerThreshold,
    rootMargin: observerRootMargin,
  });

  useEffect(() => {
    if (isIntersecting && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [isIntersecting, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderStyleItem =
    renderStyle ?? ((style: StyleItem) => <StyleCard style={style} />);

  const renderEmptyContent =
    renderEmpty ??
    ((context: { hasFilters: boolean }) => (
      <StylesEmptyState hasFilters={context.hasFilters} />
    ));

  const renderLoadingContent =
    renderLoading ??
    (() => (
      <StylesLoadingState skeletonCount={10} gridClassName={gridClassName} />
    ));

  const renderLoadMoreContent =
    renderLoadMore ??
    (() => (
      <StylesLoadingState
        skeletonCount={skeletonCount}
        gridClassName={gridClassName}
      />
    ));

  const renderErrorContent =
    renderError ??
    ((err: unknown) => (
      <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 text-center text-sm text-destructive">
        <p>Failed to load styles.</p>
        <p className="text-xs opacity-80">
          {err instanceof Error ? err.message : "Unknown error"}
        </p>
      </div>
    ));

  if (error) {
    return <>{renderErrorContent(error)}</>;
  }

  if (isLoading) {
    return <>{renderLoadingContent()}</>;
  }

  if (styles.length === 0) {
    return <>{renderEmptyContent({ hasFilters: computedHasFilters })}</>;
  }

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div
        className={cn(
          "grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5",
          gridClassName,
        )}
      >
        {styles.map((style) => (
          <Fragment key={style.id}>{renderStyleItem(style)}</Fragment>
        ))}
      </div>

      <div ref={observerRef} className="h-4" />

      {isFetchingNextPage && renderLoadMoreContent()}
    </div>
  );
}

interface StylesEmptyStateProps {
  hasFilters: boolean;
}

export function StylesEmptyState({ hasFilters }: StylesEmptyStateProps) {
  const openComposer = useStyleComposerStore((state) => state.openComposer);

  if (hasFilters) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed p-16 text-center">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <Search className="h-7 w-7 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold">No matching styles found</h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Try adjusting your search terms or explore our full collection of
          creative styles.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed p-16 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/10 to-purple-500/10">
        <Sparkles className="h-9 w-9 text-muted-foreground" />
      </div>
      <h2 className="text-2xl font-bold">
        Start Building Your Style Collection
      </h2>
      <p className="mt-3 max-w-lg text-base text-muted-foreground leading-relaxed">
        Create your first visual style to transform product imagery. Each style
        can be reused across campaigns to maintain brand consistency.
      </p>
      <Button onClick={openComposer} size="lg" className="mt-8 gap-2">
        <Plus className="h-4 w-4" />
        Create Your First Style
      </Button>
    </div>
  );
}

interface StylesLoadingStateProps {
  skeletonCount?: number;
  gridClassName?: string;
}

export function StylesLoadingState({
  skeletonCount = 10,
  gridClassName,
}: StylesLoadingStateProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5",
        gridClassName,
      )}
    >
      {Array.from({ length: skeletonCount }).map((_, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: Loading skeleton placeholder
        <CardSkeleton key={index} />
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="group relative aspect-[3/4] overflow-hidden rounded-lg">
      <Skeleton className="h-full w-full" />
    </div>
  );
}
