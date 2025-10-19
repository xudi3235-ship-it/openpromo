import type { SortingState } from "@tanstack/react-table";
import type { ListContentQueryParams } from "@worker/routes/api/workspaces/content/routes/list-content";
import { useMemo } from "react";
import type { ContentFilters } from "./content-filters";

/**
 * Hook to convert UI state to API query parameters with proper defaults
 */
export function useContentListQueryParams(
  sorting: SortingState,
  pagination: { pageIndex: number; pageSize: number },
  filters: ContentFilters,
  search: string,
): ListContentQueryParams {
  return useMemo(() => {
    // TODO: enable multiple sorting conditions
    // Convert sorting state to API parameters with default fallback
    const sortBy: "createdAt" | "scheduledDate" =
      (sorting[0]?.id as "createdAt" | "scheduledDate") || "createdAt";
    const sortOrder: "asc" | "desc" = sorting[0]
      ? sorting[0].desc
        ? "desc"
        : "asc"
      : "desc";
    return {
      page: pagination.pageIndex + 1, // API uses 1-based indexing
      pageSize: pagination.pageSize,
      fromDate: filters.dateRange?.from,
      toDate: filters.dateRange?.to,
      search: search || undefined,
      sortBy,
      sortOrder,
      publishingStatus:
        filters.publishingStatus as ListContentQueryParams["publishingStatus"],
      platform: filters.platform as ListContentQueryParams["platform"],
    } satisfies ListContentQueryParams;
  }, [sorting, pagination, filters, search]);
}
