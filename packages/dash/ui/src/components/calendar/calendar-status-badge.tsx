import { cn } from "@openpromo/ui/lib/utils";
import type { ContentPublishingStatus } from "@shared/content";
import { STATUS_CONFIG } from "@/components/content/status-badge-config";

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
