import type { ColumnDef } from "@tanstack/react-table";
import type { MergedContentEntity } from "@worker/routes/api/workspaces/content";
import { actionsColumn } from "./columns/actions-column";
import { createdAtColumn } from "./columns/created-at-column";
import { engagementColumn } from "./columns/engagement-column";
import { reachColumn } from "./columns/reach-column";
import { scheduledDateColumn } from "./columns/scheduled-date-column";
import { selectColumn } from "./columns/select-column";
import { statusColumn } from "./columns/status-column";
import { titleColumn } from "./columns/title-column";

export const columns: ColumnDef<MergedContentEntity>[] = [
  selectColumn,
  titleColumn,
  // ensure action's position
  actionsColumn,
  engagementColumn,
  reachColumn,
  scheduledDateColumn,
  createdAtColumn,
  statusColumn,
];
