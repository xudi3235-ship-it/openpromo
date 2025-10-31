import type { ProductListFilters } from "@shared/product";
import { useRouter } from "@tanstack/react-router";
import { useCallback, useMemo } from "react";

export type ViewMode = "grid" | "table";
export type ProductFilters = ProductListFilters;

/**
 * Hook to manage product filters via URL search params
 * Provides a consistent interface for both grid and table views
 */
export function useProductFilters() {
  const router = useRouter();
  const searchParams = router.latestLocation.search as ProductFilters;

  const filters: ProductFilters = useMemo(
    () => ({
      search: searchParams.search,
      view: (searchParams.view as ViewMode) || "grid",
      category: searchParams.category,
      state: searchParams.state,
    }),
    [searchParams],
  );

  const updateFilters = useCallback(
    (updates: Partial<ProductFilters>) => {
      const newSearch = {
        ...searchParams,
        ...updates,
      };

      // Remove undefined values
      Object.keys(newSearch).forEach((key) => {
        if (newSearch[key as keyof ProductFilters] === undefined) {
          delete newSearch[key as keyof ProductFilters];
        }
      });

      router.navigate({
        to: ".",
        search: newSearch,
        replace: true,
      });
    },
    [router, searchParams],
  );

  const setSearch = useCallback(
    (search: string | undefined) => {
      updateFilters({ search: search || undefined });
    },
    [updateFilters],
  );

  const setView = useCallback(
    (view: ViewMode) => {
      updateFilters({ view });
    },
    [updateFilters],
  );

  const setCategory = useCallback(
    (category: string | undefined) => {
      updateFilters({ category: category || undefined });
    },
    [updateFilters],
  );

  const setState = useCallback(
    (state: ProductFilters["state"] | undefined) => {
      updateFilters({ state: state || undefined });
    },
    [updateFilters],
  );

  const clearFilters = useCallback(() => {
    router.navigate({
      to: ".",
      search: { view: filters.view },
      replace: true,
    });
  }, [router, filters.view]);

  const hasActiveFilters = useMemo(() => {
    return Boolean(filters.search || filters.category || filters.state);
  }, [filters]);

  return {
    filters,
    updateFilters,
    setSearch,
    setView,
    setCategory,
    setState,
    clearFilters,
    hasActiveFilters,
  };
}
