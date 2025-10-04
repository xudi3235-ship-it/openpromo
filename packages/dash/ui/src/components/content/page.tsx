import {
  type ColumnFiltersState,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
  type VisibilityState,
} from "@tanstack/react-table";
import type { MergedContentEntity } from "@worker/routes/api/workspaces/content";
import { format } from "date-fns";
import * as React from "react";
import { toast } from "sonner";
import { useDebounceCallback } from "usehooks-ts";
import { CalendarRescheduleDialog } from "@/components/calendar/reschedule-dialog";
import ComposerDialog from "@/components/composer/modal/dialog-composer";
import { useContentListQuery } from "@/queries/content";
import { useCalendarRescheduleStore } from "@/stores/calendar-reschedule-store";
import { useDialogComposerStore } from "@/stores/dialog-composer-store";
import { BatchActionsToolbar } from "./batch-actions-toolbar";
import { columns } from "./columns";
import {
  ContentFilters,
  type ContentFilters as ContentFiltersType,
} from "./content-filters";
import { ContentPageBody } from "./content-page-body";
import { ContentPageFooter } from "./content-page-footer";
import { ContentPageHeader } from "./content-page-header";
import { useContentListQueryParams } from "./use-content-list-query-params";

export function ContentPage() {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const [filters, setFilters] = React.useState<ContentFiltersType>({});
  const [searchValue, setSearchValue] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const updateDebouncedSearch = useDebounceCallback((value: string) => {
    setDebouncedSearch(value.trim());
  }, 400);
  const normalizedSearch = debouncedSearch;

  const openDialog = useDialogComposerStore((state) => state.openDialog);
  const rescheduleState = useCalendarRescheduleStore((state) => state.state);
  const closeRescheduleDialog = useCalendarRescheduleStore(
    (state) => state.close,
  );

  const queryParams = useContentListQueryParams(
    sorting,
    pagination,
    filters,
    normalizedSearch,
  );

  const { data, isLoading } = useContentListQuery(queryParams);
  const table = useReactTable({
    data: (data?.entities as unknown as MergedContentEntity[]) ?? [],
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    // Server-side pagination and sorting
    manualPagination: true,
    manualSorting: true,
    pageCount: data?.pagination?.totalPages ?? 0,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      pagination,
    },
  });

  React.useEffect(() => {
    updateDebouncedSearch(searchValue);
    return () => {
      updateDebouncedSearch.cancel();
    };
  }, [searchValue, updateDebouncedSearch]);

  React.useEffect(() => {
    setPagination((prev) =>
      prev.pageIndex === 0 ? prev : { ...prev, pageIndex: 0 },
    );
  }, []);

  const selectedRows = table
    .getFilteredSelectedRowModel()
    .rows.map((row) => row.original);

  const handleRescheduleConfirm = (publishAt: Date) => {
    closeRescheduleDialog();
    toast("Reschedule pending", {
      description: format(publishAt, "MMM d, yyyy • h:mma"),
      position: "bottom-left",
    });
  };

  const handleRescheduleEditMore = () => {
    if (rescheduleState?.groupId) {
      openDialog(rescheduleState.groupId);
    }
    closeRescheduleDialog();
  };

  return (
    <div className="w-full space-y-2">
      <ContentPageHeader
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        table={table}
      />

      <ContentFilters filters={filters} onFiltersChange={setFilters} />

      <BatchActionsToolbar
        selectedRows={selectedRows}
        onClearSelection={() => table.toggleAllPageRowsSelected(false)}
      />

      <ContentPageBody table={table} isLoading={isLoading} />

      <ContentPageFooter table={table} pagination={data?.pagination} />

      <CalendarRescheduleDialog
        state={rescheduleState}
        onClose={closeRescheduleDialog}
        onConfirm={handleRescheduleConfirm}
        onEditMore={handleRescheduleEditMore}
      />
      <ComposerDialog />
    </div>
  );
}
