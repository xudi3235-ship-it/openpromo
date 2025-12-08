import type { Table } from "@tanstack/react-table";
import type { MergedContentEntity } from "@worker/shared/content-types";
import { DataTableFooter, type PaginationInfo } from "@/components/common";

interface ContentPageFooterProps {
  table: Table<MergedContentEntity>;
  pagination?: PaginationInfo;
}

export function ContentPageFooter({
  table,
  pagination,
}: ContentPageFooterProps) {
  return (
    <DataTableFooter
      table={table}
      pagination={pagination}
      showSelection={true}
      showPaginationInfo={true}
      pageSizeOptions={[10, 20, 30, 40, 50]}
    />
  );
}
