import { Button } from "@openpromo/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@openpromo/ui/components/dropdown-menu";
import { Input } from "@openpromo/ui/components/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@openpromo/ui/components/table";
import {
  type ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
  type VisibilityState,
} from "@tanstack/react-table";
import type { MergedContentEntity } from "@worker/routes/api/workspaces/content";
import { format } from "date-fns";
import { ChevronDown, Plus } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { useDebounceCallback } from "usehooks-ts";
import { CalendarRescheduleDialog } from "@/components/calendar/reschedule-dialog";
import ComposerDialog from "@/components/composer/modal/dialog-composer";
import {
  type ContentListPaginationParams,
  useContentListQuery,
} from "@/queries/content";
import { useCalendarRescheduleStore } from "@/stores/calendar-reschedule-store";
import { useDialogComposerStore } from "@/stores/dialog-composer-store";
import { BatchActionsToolbar } from "./batch-actions-toolbar";
import { columns } from "./columns";
import { ContentEmptyState } from "./content-empty-state";
import {
  ContentFilters,
  type ContentFilters as ContentFiltersType,
} from "./content-filters";
import { ContentTableSkeleton } from "./content-table-skeleton";

function useContentListQueryParams(
  sorting: SortingState,
  pagination: { pageIndex: number; pageSize: number },
  filters: ContentFiltersType,
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
    };
  }, [sorting, pagination, filters, search]);
}

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
  const title = "Content";
  const subtitle = "Plan, publish, and measure everything in one place.";

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
      <div className="flex flex-wrap items-start gap-4">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <div className="flex gap-2 ml-auto">
          <Button onClick={() => openDialog()}>
            <Plus className="h-4 w-4" />
            Create Post
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                Columns <ChevronDown />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                    >
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  );
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3 md:gap-4 py-2">
        <Input
          placeholder="Search content..."
          value={searchValue}
          onChange={(event) => setSearchValue(event.target.value)}
          className="max-w-sm"
        />
      </div>

      <ContentFilters filters={filters} onFiltersChange={setFilters} />

      <BatchActionsToolbar
        selectedRows={selectedRows}
        onClearSelection={() => table.toggleAllPageRowsSelected(false)}
      />
      {isLoading ? (
        <ContentTableSkeleton />
      ) : (
        <div className="overflow-hidden rounded-md border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="p-0">
                    <ContentEmptyState />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
      <div className="flex items-center justify-between space-x-2 py-4">
        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
          <div>
            {table.getFilteredSelectedRowModel().rows.length} of{" "}
            {table.getFilteredRowModel().rows.length} row(s) selected.
          </div>
          {data?.pagination && (
            <div>
              Showing{" "}
              {(data.pagination.page - 1) * data.pagination.pageSize + 1} to{" "}
              {Math.min(
                data.pagination.page * data.pagination.pageSize,
                data.pagination.total,
              )}{" "}
              of {data.pagination.total} total entries
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium">Rows per page</p>
            <select
              value={table.getState().pagination.pageSize}
              onChange={(e) => {
                table.setPageSize(Number(e.target.value));
              }}
              className="h-8 w-[70px] rounded border border-input bg-background px-2 text-sm"
            >
              {[10, 20, 30, 40, 50].map((pageSize) => (
                <option key={pageSize} value={pageSize}>
                  {pageSize}
                </option>
              ))}
            </select>
          </div>

          <div className="flex w-[100px] items-center justify-center text-sm font-medium">
            Page {data?.pagination?.page ?? 1} of{" "}
            {data?.pagination?.totalPages ?? 1}
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.setPageIndex(0)}
              disabled={!data?.pagination?.hasPreviousPage}
            >
              {"<<"}
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.previousPage()}
              disabled={!data?.pagination?.hasPreviousPage}
            >
              {"<"}
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.nextPage()}
              disabled={!data?.pagination?.hasNextPage}
            >
              {">"}
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() =>
                table.setPageIndex((data?.pagination?.totalPages ?? 1) - 1)
              }
              disabled={!data?.pagination?.hasNextPage}
            >
              {">>"}
            </Button>
          </div>
        </div>
      </div>

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
