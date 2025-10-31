import { cn } from "@openpromo/ui/lib/utils";
import type { PlacementSpec } from "@shared/content";
import type { CalendarEvent } from "@/components/calendar";
import { getEventData } from "@/components/calendar";
import { getPlatformIcon } from "@/components/content/utils/platform-icons";
import { useCalendarActions } from "@/hooks/content";
import { matchEntity, matchPlacementSpec } from "@/lib/hono-client";
import { CalendarEventCardActionsMenu } from "./calendar-event-card-actions-menu";

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

interface CalendarEventCardCompactProps {
  event: CalendarEvent;
  onClick?: (e: React.MouseEvent) => void;
  onDelete?: (eventId: string) => void;
  className?: string;
}

/**
 * Compact event card for month view - minimal layout to save vertical space
 */
export function CalendarEventCardCompact({
  event,
  onClick,
  onDelete,
  className,
}: CalendarEventCardCompactProps) {
  const eventData = getEventData(event);
  const {
    handleDelete,
    handleEdit,
    handlePublish,
    handleView,
    handleReschedule,
    getPermalink,
    isEditable: isEntityEditable,
    canPublish: canEntityPublish,
    canReschedule,
    editLabel: getEditLabel,
    deleteLabel: getDeleteLabel,
    isPublishing,
  } = useCalendarActions(onDelete);

  const contentPermalink = getPermalink(event);
  const isEditable = isEntityEditable(event);
  const canPublish = canEntityPublish(event);
  const editLabel = getEditLabel(event);
  const deleteLabel = getDeleteLabel(event);

  const renderActionsMenu = () => (
    <CalendarEventCardActionsMenu
      event={event}
      contentPermalink={contentPermalink ?? undefined}
      isEditable={isEditable}
      canPublish={canPublish}
      canReschedule={canReschedule(event)}
      isPublishing={isPublishing}
      editLabel={editLabel}
      deleteLabel={deleteLabel}
      onView={handleView}
      onEdit={handleEdit}
      onReschedule={handleReschedule}
      onPublish={handlePublish}
      onDelete={handleDelete}
    />
  );

  return matchEntity(event, {
    content: (entity) => {
      const { entity: content } = entity;
      const platformIcon = getPlatformIcon(content.placement);
      const thumbnailSrc = getThumbnailFromPlacement(
        content.placementSpec as PlacementSpec,
      );

      // Extract caption/message from placement spec
      const message = matchPlacementSpec(
        content.placementSpec as PlacementSpec,
        {
          FBFeed: (s) => s.postSpec.message,
          IGFeed: (s) => s.caption,
          TTFeed: (s) => s.caption,
        },
      );

      const displayText = message || eventData.title;

      return (
        <button
          type="button"
          className={cn(
            "w-full bg-background border border-border rounded-md px-0.5 py-0.5 text-xs",
            "cursor-pointer hover:bg-accent/50 transition-colors overflow-hidden text-left",
            "flex items-center gap-0.5 group relative h-6",
            className,
          )}
          onClick={onClick}
        >
          {/* Thumbnail - small square */}
          {thumbnailSrc && (
            <div className="w-6 h-6 flex-shrink-0 rounded overflow-hidden">
              <img
                src={thumbnailSrc}
                alt="thumbnail"
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Title - truncated */}
          <div className="flex-1 min-w-0">
            <div className="font-medium text-foreground truncate text-[10px] leading-tight">
              {displayText}
            </div>
          </div>

          {/* Platform icon - small */}
          {platformIcon && (
            <div className="w-2.5 h-2.5 flex-shrink-0 opacity-70">
              {platformIcon}
            </div>
          )}

          {/* Actions menu - hidden until hover */}
          <div className="absolute right-0 top-0 bottom-0 pr-0.5 flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
            {renderActionsMenu()}
          </div>
        </button>
      );
    },
    group: (entity) => {
      const { contents } = entity;
      const platforms = [
        ...new Set(contents.map((content) => content.placement)),
      ];

      return (
        <button
          type="button"
          className={cn(
            "w-full bg-background border border-border rounded-md px-0.5 py-0.5 text-xs",
            "cursor-pointer hover:bg-accent/50 transition-colors overflow-hidden text-left",
            "flex items-center gap-0.5 group relative h-6",
            className,
          )}
          onClick={onClick}
        >
          {/* Platform icons - stacked */}
          <div className="flex gap-0.5 flex-shrink-0">
            {platforms.slice(0, 2).map((platform) => {
              const platformIcon = getPlatformIcon(platform);
              return platformIcon ? (
                <div key={platform} className="w-2.5 h-2.5 opacity-70">
                  {platformIcon}
                </div>
              ) : null;
            })}
            {platforms.length > 2 && (
              <div className="w-2 h-2 bg-muted rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-[6px] font-semibold text-muted-foreground leading-none">
                  +
                </span>
              </div>
            )}
          </div>

          {/* Title with post count - truncated */}
          <div className="flex-1 min-w-0">
            <div className="font-medium text-foreground truncate text-[10px] leading-tight">
              {eventData.title}
            </div>
          </div>

          {/* Actions menu - hidden until hover */}
          <div className="absolute right-0 top-0 bottom-0 pr-0.5 flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
            {renderActionsMenu()}
          </div>
        </button>
      );
    },
  });
}
