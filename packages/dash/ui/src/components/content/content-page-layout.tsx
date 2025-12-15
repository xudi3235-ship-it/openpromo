import type { Table } from "@tanstack/react-table";
import type { MergedContentEntity } from "@worker/shared/content-types";
import {
  ContentFilters,
  type ContentFilters as ContentFiltersType,
} from "./content-filters";
import { ContentPageSearchHeader } from "./content-page-header";
import { ContentRescheduleDialog } from "./content-reschedule-dialog";

interface ContentPageLayoutProps {
  children: React.ReactNode;
  searchValue: string;
  onSearchChange: (value: string) => void;
  table?: Table<MergedContentEntity>;
  filters: ContentFiltersType;
  onFiltersChange: (filters: ContentFiltersType) => void;
  batchActions?: React.ReactNode;
}

/**
 * Shared layout wrapper for content page that includes:
 * - Header with search and column visibility
 * - Filters section with optional batch actions
 * - Dialogs (Reschedule and Composer)
 */
export function ContentPageLayout({
  children,
  searchValue,
  onSearchChange,
  table,
  filters,
  onFiltersChange,
  batchActions,
}: ContentPageLayoutProps) {
  return (
    <div className="flex h-full flex-col gap-2">
      {/* Header with search and column controls only */}
      {table && (
        <ContentPageSearchHeader
          searchValue={searchValue}
          onSearchChange={onSearchChange}
          table={table}
        />
      )}

      <ContentFilters
        filters={filters}
        onFiltersChange={onFiltersChange}
        batchActions={batchActions}
      />

      {/* Main content area - flex-1 to take remaining space, min-h-0 for scroll containment */}
      <div className="flex min-h-0 flex-1 flex-col gap-2">{children}</div>

      <ContentRescheduleDialog />
    </div>
  );
}
