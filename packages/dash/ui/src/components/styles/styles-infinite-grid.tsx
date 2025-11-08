import { Skeleton } from "@openpromo/ui/components/skeleton";
import { cn } from "@openpromo/ui/lib/utils";
import type { ReactNode } from "react";
import { Fragment, useEffect, useMemo } from "react";
import { useIntersectionObserver } from "usehooks-ts";
// icons removed to keep empty states minimal and on-brand
import {
  type StyleResponse,
  type StylesListParams,
  useStylesInfiniteQuery,
} from "@/queries/styles";
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
    isPending,
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

  if (isPending) {
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
  // Minimal, flat empty states without decorative icons to match site aesthetics
  if (hasFilters) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center rounded-md border border-border/50 p-8 text-center bg-transparent">
        <h2 className="text-lg font-medium">No styles match your filters</h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Try clearing filters or adjust your search to discover more styles.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center rounded-md border border-border/50 p-8 text-center bg-transparent">
      <h2 className="text-lg font-semibold">Build your first style</h2>
      <p className="mt-2 max-w-lg text-sm text-muted-foreground leading-relaxed">
        Drag 3–5 reference images into the composer dock below to create your
        first reusable visual style.
      </p>
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
