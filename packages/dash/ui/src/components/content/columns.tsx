import type { ColumnDef } from "@tanstack/react-table";
import type { MergedContentEntity } from "@worker/routes/api/workspaces/content";
import { actionsColumn } from "./columns/actions-column";
import { createdAtColumn } from "./columns/created-at-column";
import { placementColumn } from "./columns/placement-column";
import { selectColumn } from "./columns/select-column";
import { statusColumn } from "./columns/status-column";
import { titleColumn } from "./columns/title-column";

export const columns: ColumnDef<MergedContentEntity>[] = [
  selectColumn,
  titleColumn,
  createdAtColumn,
  placementColumn,
  statusColumn,
  actionsColumn,
];
