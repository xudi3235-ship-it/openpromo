import type { ProductListFilters } from "@shared/product";
import { useCallback, useMemo } from "react";
import { Route as ProductsRoute } from "@/routes/_authenticated/workspaces/$workspaceSlug/products/index";

export type ViewMode = "grid" | "table";
export type ProductFilters = ProductListFilters;

/**
 * Hook to manage product filters via URL search params
 * Provides a consistent interface for both grid and table views
 */
export function useProductFilters() {
  const navigate = ProductsRoute.useNavigate();
  const searchParams = ProductsRoute.useSearch();

  const filters: ProductFilters = useMemo(
    () => ({
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

      navigate({
        search: newSearch,
        replace: true,
      });
    },
    [navigate, searchParams],
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
    navigate({
      search: { view: filters.view },
      replace: true,
    });
  }, [navigate, filters.view]);

  const hasActiveFilters = useMemo(() => {
    return Boolean(filters.category || filters.state);
  }, [filters]);

  return {
    filters,
    updateFilters,
    setView,
    setCategory,
    setState,
    clearFilters,
    hasActiveFilters,
  };
}
