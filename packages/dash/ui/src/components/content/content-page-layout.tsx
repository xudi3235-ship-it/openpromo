import type { Table } from "@tanstack/react-table";
import type { MergedContentEntity } from "@worker/shared/content-types";
import {
  ContentFilters,
  type ContentFilters as ContentFiltersType,
} from "./content-filters";
import { ContentPageHeader } from "./content-page-header";
import { ContentRescheduleDialog } from "./content-reschedule-dialog";

interface ContentPageLayoutProps {
  children: React.ReactNode;
  searchValue: string;
  onSearchChange: (value: string) => void;
  table: Table<MergedContentEntity>;
  filters: ContentFiltersType;
  onFiltersChange: (filters: ContentFiltersType) => void;
}

/**
 * Shared layout wrapper for content page that includes:
 * - Header with search and column visibility
 * - Filters section
 * - Dialogs (Reschedule and Composer)
 */
export function ContentPageLayout({
  children,
  searchValue,
  onSearchChange,
  table,
  filters,
  onFiltersChange,
}: ContentPageLayoutProps) {
  return (
    <div className="w-full space-y-2">
      <ContentPageHeader
        searchValue={searchValue}
        onSearchChange={onSearchChange}
        table={table}
      />

      <ContentFilters filters={filters} onFiltersChange={onFiltersChange} />

      {children}

      <ContentRescheduleDialog />
    </div>
  );
}
