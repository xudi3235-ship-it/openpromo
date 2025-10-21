import type { ColumnDef } from "@tanstack/react-table";
import type { MergedContentEntity } from "@worker/routes/api/workspaces/content";
import { actionsColumn } from "./columns/actions-column";
import { commentsColumn } from "./columns/comments-column";
import { createdAtColumn } from "./columns/created-at-column";
import { engagementColumn } from "./columns/engagement-column";
import { impressionsColumn } from "./columns/impressions-column";
import { likesColumn } from "./columns/likes-column";
import { metricsRefreshedColumn } from "./columns/metrics-refreshed-column";
import { reachColumn } from "./columns/reach-column";
import { scheduledDateColumn } from "./columns/scheduled-date-column";
import { selectColumn } from "./columns/select-column";
import { sharesColumn } from "./columns/shares-column";
import { statusColumn } from "./columns/status-column";
import { titleColumn } from "./columns/title-column";

export const columns: ColumnDef<MergedContentEntity>[] = [
  selectColumn,
  titleColumn,
  statusColumn,
  // ensure action's position
  actionsColumn,
  impressionsColumn,
  reachColumn,
  engagementColumn,
  likesColumn,
  commentsColumn,
  sharesColumn,
  metricsRefreshedColumn,
  scheduledDateColumn,
  createdAtColumn,
];
