import type { SortingState } from "@tanstack/react-table";
import { useMemo } from "react";
import type { ContentListParams } from "@/queries/content-orpc";
import type { ContentFilters } from "./content-filters";

/**
 * Hook to convert UI state to API query parameters with proper defaults
 */
export function useContentListQueryParams(
  sorting: SortingState,
  pagination: { pageIndex: number; pageSize: number },
  filters: ContentFilters,
  search: string,
): ContentListParams {
  return useMemo(() => {
    // TODO: enable multiple sorting conditions
    // Convert sorting state to API parameters with default fallback
    const sortBy: ContentListParams["sortBy"] =
      (sorting[0]?.id as ContentListParams["sortBy"]) || "createdAt";
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
        filters.publishingStatus as ContentListParams["publishingStatus"],
      platform: filters.platform as ContentListParams["platform"],
    } satisfies ContentListParams;
  }, [sorting, pagination, filters, search]);
}
