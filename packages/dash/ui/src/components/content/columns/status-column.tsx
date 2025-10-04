import { Badge } from "@openpromo/ui/components/badge";
import type { ContentPublishingStatus } from "@shared/content";
import type { ColumnDef } from "@tanstack/react-table";
import type { MergedContentEntity } from "@worker/routes/api/workspaces/content";
import { AlertCircle, CheckCircle, Clock, FileText, Zap } from "lucide-react";
import { matchEntity } from "@/lib/hono-client";
import { ColumnHeaderWithTooltip } from "./column-header-with-tooltip";

function getStatusBadge(status: ContentPublishingStatus) {
  switch (status) {
    case "PUBLISHED":
      return (
        <Badge
          variant="default"
          className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
        >
          <CheckCircle className="w-3 h-3 mr-1" />
          Published
        </Badge>
      );
    case "SCHEDULED":
      return (
        <Badge
          variant="secondary"
          className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
        >
          <Clock className="w-3 h-3 mr-1" />
          Scheduled
        </Badge>
      );
    case "DRAFT":
      return (
        <Badge
          variant="outline"
          className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
        >
          <FileText className="w-3 h-3 mr-1" />
          Draft
        </Badge>
      );
    case "FAILED_TO_PUBLISH":
      return (
        <Badge
          variant="destructive"
          className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
        >
          <AlertCircle className="w-3 h-3 mr-1" />
          Failed
        </Badge>
      );
    case "PUBLISH_NOW":
      return (
        <Badge
          variant="default"
          className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
        >
          <Zap className="w-3 h-3 mr-1" />
          Publishing
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
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
