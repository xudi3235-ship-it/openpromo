import type { SortingState } from "@tanstack/react-table";
import * as React from "react";
import type { ContentListPaginationParams } from "@/queries/content";
import type { ContentFilters } from "./content-filters";

/**
 * Hook to convert UI state to API query parameters with proper defaults
 */
export function useContentListQueryParams(
  sorting: SortingState,
  pagination: { pageIndex: number; pageSize: number },
  filters: ContentFilters,
  search: string,
): ContentListPaginationParams {
  return React.useMemo(() => {
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
      publishingStatus: filters.publishingStatus,
      fromDate: filters.dateRange?.from,
      toDate: filters.dateRange?.to,
      search: search || undefined,
      sortBy,
      sortOrder,
      platform: filters.platform,
    };
  }, [sorting, pagination, filters, search]);
}
