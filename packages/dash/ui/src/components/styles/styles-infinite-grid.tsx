import { Skeleton } from "@openpromo/ui/components/skeleton";
import { cn } from "@openpromo/ui/lib/utils";
import type { ReactNode } from "react";
import { Fragment, useEffect, useMemo } from "react";
import { useIntersectionObserver } from "usehooks-ts";
import { ImageGrid } from "@/components/common/ImageGrid";
// icons removed to keep empty states minimal and on-brand
import {
  type StyleResponse,
  type StylesListParams,
  useStylesInfiniteQuery,
} from "@/queries/styles-queries";
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
    <div className={cn("flex flex-col", className)}>
      <ImageGrid tight className={gridClassName}>
        {styles.map((style) => (
          <Fragment key={style.id}>{renderStyleItem(style)}</Fragment>
        ))}
      </ImageGrid>

      <div ref={observerRef} className="h-4" />

      {isFetchingNextPage && renderLoadMoreContent()}
    </div>
  );
}

interface StylesEmptyStateProps {
  hasFilters: boolean;
}

export function StylesEmptyState({ hasFilters }: StylesEmptyStateProps) {
  // Minimal, flat empty states without decorative icons to match OpenAI aesthetics
  if (hasFilters) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-border/40 bg-muted/20 p-12 text-center">
        <h2 className="text-base font-medium">No styles found</h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Try adjusting your search or filters
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-border/40 bg-muted/20 p-12 text-center">
      <h2 className="text-base font-medium">No styles yet</h2>
      <p className="mt-2 max-w-lg text-sm text-muted-foreground leading-relaxed">
        Start by adding reference images in the composer below
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
    <ImageGrid tight className={gridClassName}>
      {Array.from({ length: skeletonCount }).map((_, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: Loading skeleton placeholder
        <CardSkeleton key={index} />
      ))}
    </ImageGrid>
  );
}

export function CardSkeleton() {
  return (
    <div className="group relative aspect-square overflow-hidden border border-gray-200 dark:border-gray-800">
      <Skeleton className="h-full w-full" />
    </div>
  );
}
