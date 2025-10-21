import { cn } from "@openpromo/ui/lib/utils";
import type { PlacementSpec } from "@shared/content";
import type { ContentEntity } from "@worker/routes/api/workspaces/content";
import { matchPlacementSpec } from "@/lib/hono-client";
import { CalendarEventCardHeader } from "./calendar-event-card-header";
import { CalendarEventCardMetrics } from "./calendar-event-card-metrics";
import { CalendarEventCardThumbnail } from "./calendar-event-card-thumbnail";

// Helper to get thumbnail URL from placement spec
function getThumbnailFromPlacement(
  placementSpec: PlacementSpec,
): string | undefined {
  if (placementSpec?.thumbnailUrl) {
    return placementSpec.thumbnailUrl;
  }

  const attachments = placementSpec?.attachments;
  if (attachments && attachments.length > 0) {
    // biome-ignore lint/suspicious/noExplicitAny: legacy code
    const firstAttachment = attachments.find((att: any) => att.publicUrl);
    if (firstAttachment?.publicUrl) {
      return firstAttachment.publicUrl;
    }
  }

  return undefined;
}

interface CalendarEventCardContentProps {
  entity: ContentEntity;
  title: string;
  startTime: Date;
  platformIcon?: React.ReactNode;
  showTime?: boolean;
  isDragging?: boolean;
  className?: string;
  renderActionsMenu: () => React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
}

export function CalendarEventCardContent({
  entity,
  title,
  startTime,
  platformIcon,
  showTime = true,
  isDragging,
  className,
  renderActionsMenu,
  onClick,
}: CalendarEventCardContentProps) {
  const {
    entity: { placementSpec, publishingStatus, metrics },
  } = entity;

  const thumbnailSrc = getThumbnailFromPlacement(
    placementSpec as PlacementSpec,
  );

  const message = matchPlacementSpec(placementSpec as PlacementSpec, {
    FBFeed: (s) => s.postSpec.message,
    IGFeed: (s) => s.caption,
    TTFeed: (s) => s.caption,
  });

  return (
    <div
      className={cn(
        "group w-full h-full rounded-lg transition-all relative overflow-hidden bg-white dark:bg-gray-800",
        "hover:bg-gray-50 dark:hover:bg-gray-750 min-h-[150px] border-[0.5px] border-gray-200 dark:border-gray-700",
        "flex flex-col",
        isDragging && "opacity-50 cursor-grabbing",
        className,
      )}
    >
      <CalendarEventCardHeader
        showTime={showTime}
        startTime={startTime}
        renderActionsMenu={renderActionsMenu}
      />

      <CalendarEventCardThumbnail src={thumbnailSrc} />

      {/* Content section - grows to fill space */}
      <div className="flex-1 px-2 pb-2 flex flex-col justify-between min-h-0">
        {/* Message */}
        <p className="text-gray-900 dark:text-gray-100 text-xs font-medium line-clamp-2 leading-snug mb-2">
          {message || title}
        </p>

        {/* Footer with metrics and platform */}
        {publishingStatus === "PUBLISHED" && (
          <CalendarEventCardMetrics
            metrics={metrics}
            platformIcon={platformIcon}
          />
        )}
        {publishingStatus !== "PUBLISHED" && platformIcon && (
          <div className="flex items-end justify-end">
            <div className="flex-shrink-0 bg-gray-100 dark:bg-gray-700 rounded-full p-1">
              {platformIcon}
            </div>
          </div>
        )}
      </div>

      {/* Main clickable area */}
      {/* biome-ignore lint/a11y/useButtonType: later */}
      <button
        className="absolute inset-0 focus:outline-none focus:ring-2 focus:ring-primary/50 rounded-lg z-0"
        onClick={onClick}
      >
        <span className="sr-only">Open content</span>
      </button>
    </div>
  );
}
