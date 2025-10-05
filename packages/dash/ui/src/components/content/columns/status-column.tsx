import { Badge } from "@openpromo/ui/components/badge";
import type { ContentPublishingStatus } from "@shared/content";
import type { ColumnDef } from "@tanstack/react-table";
import type { MergedContentEntity } from "@worker/routes/api/workspaces/content";
import { matchEntity } from "@/lib/hono-client";
import { STATUS_CONFIG } from "../status-badge-config";
import { ColumnHeaderWithTooltip } from "./column-header-with-tooltip";

function getStatusBadge(status: ContentPublishingStatus) {
  const config = STATUS_CONFIG[status];
  if (!config) {
    return <Badge variant="outline">{status}</Badge>;
  }

  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className={config.className}>
      <Icon className="w-3 h-3 mr-1" />
      {config.label}
    </Badge>
  );
}

export const statusColumn: ColumnDef<MergedContentEntity> = {
  accessorKey: "Status",
  header: () => (
    <div className="text-right">
      <ColumnHeaderWithTooltip
        tooltip="Current publishing status of the content"
        className="cursor-help"
      >
        Status
      </ColumnHeaderWithTooltip>
    </div>
  ),
  cell: ({ row }) => {
    return matchEntity(row.original, {
      content: (entity) => (
        <div className="text-right">
          {getStatusBadge(entity.entity.publishingStatus)}
        </div>
      ),
      group: (entity) => (
        <div className="text-right">
          {getStatusBadge(entity.entity.publishingStatus)}
        </div>
      ),
    });
  },
};
