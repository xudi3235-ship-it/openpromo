import { Button } from "@openpromo/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@openpromo/ui/components/dropdown-menu";
import { Input } from "@openpromo/ui/components/input";
import type { Table } from "@tanstack/react-table";
import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";

export interface DataTableHeaderProps<TData> {
  /** The TanStack table instance */
  table: Table<TData>;
  /** Search value */
  searchValue?: string;
  /** Search change handler */
  onSearchChange?: (value: string) => void;
  /** Search placeholder */
  searchPlaceholder?: string;
  /** Show column visibility control */
  showColumnControl?: boolean;
  /** Custom column icons mapping */
  columnIcons?: Record<string, ReactNode>;
  /** Custom actions to display in header */
  actions?: ReactNode;
  /** Custom className */
  className?: string;
}

/**
 * DataTableHeader - Reusable table header with search and column control
 *
 * A standardized header component for data tables with search input
 * and column visibility controls.
 *
 * @example
 * ```tsx
 * <DataTableHeader
 *   table={table}
 *   searchValue={search}
 *   onSearchChange={setSearch}
 *   searchPlaceholder="Search content..."
 * />
 * ```
 */
export function DataTableHeader<TData>({
  table,
  searchValue = "",
  onSearchChange,
  searchPlaceholder = "Search...",
  showColumnControl = true,
  columnIcons,
  actions,
  className = "",
}: DataTableHeaderProps<TData>) {
  return (
    <div
      className={`flex flex-wrap items-center gap-3 md:gap-4 py-2 ${className}`}
    >
      {/* Search input */}
      {onSearchChange && (
        <Input
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          className="max-w-sm"
        />
      )}

      {/* Column visibility control */}
      {showColumnControl && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              Columns <ChevronDown />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => {
                const icon = columnIcons?.[column.id];
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) =>
                      column.toggleVisibility(!!value)
                    }
                  >
                    <div className="flex items-center gap-2">
                      {icon}
                      <span>{column.id}</span>
                    </div>
                  </DropdownMenuCheckboxItem>
                );
              })}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Custom actions */}
      {actions && <div className="ml-auto">{actions}</div>}
    </div>
  );
}
