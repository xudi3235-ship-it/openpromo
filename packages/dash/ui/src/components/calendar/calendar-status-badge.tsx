import { cn } from "@openpromo/ui/lib/utils";
import type { ContentPublishingStatus } from "@shared/content";

const STATUS_CONFIG: Record<
  ContentPublishingStatus,
  { label: string; className: string }
> = {
  DRAFT: {
    label: "Draft",
    className: "bg-orange-500/10 text-orange-700 dark:text-orange-300",
  },
  SCHEDULED: {
    label: "Scheduled",
    className: "bg-green-500/10 text-green-700 dark:text-green-300",
  },
  PUBLISHED: {
    label: "Published",
    className: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  },
  FAILED_TO_PUBLISH: {
    label: "Failed",
    className: "bg-red-500/10 text-red-700 dark:text-red-300",
  },
  PUBLISH_NOW: {
    label: "Publishing",
    className: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300",
  },
};

interface CalendarStatusBadgeProps {
  status: ContentPublishingStatus;
  className?: string;
}

export function CalendarStatusBadge({
  status,
  className,
}: CalendarStatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  return (
    <div
      className={cn(
        "px-1.5 py-0.5 rounded text-[10px] font-medium",
        config.className,
        className,
      )}
    >
      {config.label}
    </div>
  );
}
