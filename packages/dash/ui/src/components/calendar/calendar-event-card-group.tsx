import { cn } from "@openpromo/ui/lib/utils";
import type { PlacementSpec } from "@shared/content";
import type { GroupEntity } from "@worker/shared/content-types";
import { getPlatformIcon } from "@/components/content/utils/platform-icons";
import { matchPlacementSpec } from "@/lib/hono-client";
import { CalendarEventCardHeader } from "./calendar-event-card-header";
import { CalendarEventCardThumbnail } from "./calendar-event-card-thumbnail";
import { CalendarStatusBadge } from "./calendar-status-badge";

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

interface CalendarEventCardGroupProps {
  entity: GroupEntity;
  title: string;
  startTime: Date;
  showTime?: boolean;
  isDragging?: boolean;
  className?: string;
  renderActionsMenu: () => React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
}

export function CalendarEventCardGroup({
  entity,
  title,
  startTime,
  showTime = true,
  isDragging,
  className,
  renderActionsMenu,
  onClick,
}: CalendarEventCardGroupProps) {
  const { contents } = entity;

  // Get unique platforms from the contents
  const platforms = [...new Set(contents.map((content) => content.placement))];

  // Get the primary message (use first content's message as representative)
  const primaryMessage =
    contents.length > 0
      ? matchPlacementSpec(contents[0].placementSpec as PlacementSpec, {
          FBFeed: (s) => s.postSpec.message,
          IGFeed: (s) => s.caption,
          TTFeed: (s) => s.caption,
        })
      : "Untitled Group";

  // Get first thumbnail or default
  const contentWithThumbnail = contents.find(
    (c) =>
      c.placementSpec != null && getThumbnailFromPlacement(c.placementSpec),
  );
  const thumbnailUrl = contentWithThumbnail
    ? getThumbnailFromPlacement(
        contentWithThumbnail.placementSpec as PlacementSpec,
      )
    : undefined;

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

      <CalendarEventCardThumbnail src={thumbnailUrl} />

      {/* Content section - grows to fill space */}
      <div className="flex-1 px-2 pb-2 flex flex-col justify-between min-h-0">
        {/* Message */}
        <p className="text-gray-900 dark:text-gray-100 text-xs font-medium line-clamp-2 leading-snug mb-2">
          {primaryMessage || title}
        </p>

        {/* Footer with status badge, post count, and platforms */}
        <div className="flex items-end justify-between gap-2 mt-auto">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Status badge */}
            <CalendarStatusBadge status={entity.entity.publishingStatus} />
            <p className="text-gray-600 dark:text-gray-400 text-[10px]">
              {contents.length} post{contents.length !== 1 ? "s" : ""}
            </p>
          </div>

          {/* Platform stack */}
          <div className="flex gap-1 flex-shrink-0">
            {platforms.slice(0, 2).map((platform) => {
              const platformIcon = getPlatformIcon(platform);
              return platformIcon ? (
                <div
                  key={platform}
                  className="bg-gray-100 dark:bg-gray-700 rounded-full p-1"
                >
                  {platformIcon}
                </div>
              ) : null;
            })}
            {platforms.length > 2 && (
              <div className="bg-gray-100 dark:bg-gray-700 rounded-full p-1 flex items-center justify-center min-w-4 h-4">
                <span className="text-[10px] font-semibold text-gray-900 dark:text-gray-100">
                  +{platforms.length - 2}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main clickable area */}
      {/* biome-ignore lint/a11y/useButtonType: later */}
      <button
        className="absolute inset-0 focus:outline-none focus:ring-2 focus:ring-primary/50 rounded-lg z-0"
        onClick={onClick}
      >
        <span className="sr-only">Open content group</span>
      </button>
    </div>
  );
}
