import type { PlacementSpec } from "@core/schemas/content.sql";
import { cn } from "@openpromo/ui/lib/utils";
import type { ContentEntity } from "@worker/routes/api/workspaces/content";
import { format, getMinutes } from "date-fns";
import { Image } from "lucide-react";
import { type CalendarEvent, getEventData } from "@/components/calendar";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { getPlatformIcon } from "@/components/content/utils/platform-icons";
import { ContentActionsMenu } from "@/components/content-actions-menu";
import { useCalendarActions } from "@/hooks/content";
import { matchEntity, matchPlacementSpec } from "@/lib/hono-client";

// Helper to get thumbnail URL from placement spec
function getThumbnailFromPlacement(
  placementSpec: PlacementSpec,
): string | undefined {
  // First try thumbnailUrl field
  if (placementSpec?.thumbnailUrl) {
    return placementSpec.thumbnailUrl;
  }

  // Then try to get from attachments array
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

// Thumbnail component with fallback - full size
function ThumbnailImage({
  src,
  alt = "Content thumbnail",
  className = "rounded-lg object-cover",
}: {
  src?: string;
  alt?: string;
  className?: string;
}) {
  if (!src) {
    return (
      <div
        className={cn(
          className,
          "w-full h-full bg-muted flex items-center justify-center",
        )}
      >
        <Image className="w-6 h-6 text-muted-foreground" />
      </div>
    );
  }

  return <img src={src} alt={alt} className={cn(className, "w-full h-full")} />;
}

// Format time with optional minutes
const formatTimeWithOptionalMinutes = (date: Date) => {
  return format(date, getMinutes(date) === 0 ? "ha" : "h:mma").toLowerCase();
};

interface CalendarEventCardProps {
  event: CalendarEvent;
  onClick?: (e: React.MouseEvent) => void;
  onDelete?: (eventId: string) => void;
  showTime?: boolean;
  className?: string;
  isDragging?: boolean;
}

export function CalendarEventCard({
  event,
  onClick,
  onDelete,
  showTime = true,
  className,
  isDragging,
}: CalendarEventCardProps) {
  const eventData = getEventData(event);
  const {
    handleDelete,
    handleEdit,
    showConfirm,
    setShowConfirm,
    deleteConfig,
    handleConfirm,
    isDeleting,
  } = useCalendarActions(onDelete);

  return (
    <>
      {matchEntity(event, {
        content: (entity) => {
          const {
            entity: { placementSpec, placement },
          } = entity as ContentEntity;

          const thumbnailSrc = getThumbnailFromPlacement(
            placementSpec as PlacementSpec,
          );
          const platformIcon = getPlatformIcon(placement);

          const message = matchPlacementSpec(placementSpec as PlacementSpec, {
            FBFeed: (s) => s.postSpec.message,
            IGFeed: (s) => s.caption,
          });

          return (
            <div
              className={cn(
                "group w-full h-full rounded-lg transition-all relative overflow-hidden",
                "hover:shadow-lg min-h-[80px] shadow-sm hover:scale-[1.02]",
                isDragging && "opacity-50 cursor-grabbing",
                className,
              )}
            >
              {/* Full-size thumbnail background */}
              <ThumbnailImage src={thumbnailSrc} />

              {/* Subtle overlay for better text readability */}
              <div className="absolute inset-0 bg-black/20" />

              {/* Main clickable area - excludes the top-right corner for actions */}
              {/* biome-ignore lint/a11y/useButtonType: later */}
              <button
                className="absolute inset-0 right-10 focus:outline-none focus:ring-2 focus:ring-primary/50 rounded-lg"
                onClick={onClick}
              >
                <span className="sr-only">Open content</span>
              </button>

              {/* Time overlay - top left */}
              {showTime && (
                <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm text-gray-900 px-2 py-1 rounded-md text-xs font-semibold shadow-sm pointer-events-none">
                  {formatTimeWithOptionalMinutes(eventData.start)}
                </div>
              )}

              {/* Platform icon - bottom right */}
              {platformIcon && (
                <div className="absolute bottom-2 right-2 bg-white/95 backdrop-blur-sm rounded-full p-2 shadow-lg border border-white/20 pointer-events-none">
                  {platformIcon}
                </div>
              )}

              {/* Actions menu - top right - separate click area */}
              <div className="absolute top-0 right-0 w-10 h-10 flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <ContentActionsMenu
                    entity={event}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                </div>
              </div>

              {/* Message overlay - bottom with improved gradient */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 pt-8 pointer-events-none">
                <p className="text-white text-sm font-medium line-clamp-2 leading-snug drop-shadow-sm">
                  {message || eventData.title}
                </p>
              </div>
            </div>
          );
        },
        group: (entity) => {
          const { contents } = entity;

          // Get unique platforms from the contents
          const platforms = [
            ...new Set(contents.map((content) => content.placement)),
          ];

          // Get the primary message (use first content's message as representative)
          const primaryMessage =
            contents.length > 0
              ? matchPlacementSpec(contents[0].placementSpec as PlacementSpec, {
                  FBFeed: (s) => s.postSpec.message,
                  IGFeed: (s) => s.caption,
                })
              : "Untitled Group";

          // Get first thumbnail or default
          const contentWithThumbnail = contents.find(
            (c) =>
              c.placementSpec != null &&
              getThumbnailFromPlacement(c.placementSpec),
          );
          const thumbnailUrl = contentWithThumbnail
            ? getThumbnailFromPlacement(
                contentWithThumbnail.placementSpec as PlacementSpec,
              )
            : undefined;

          return (
            <div
              className={cn(
                "group w-full h-full rounded-lg transition-all relative overflow-hidden",
                "hover:shadow-lg min-h-[80px] shadow-sm hover:scale-[1.02]",
                isDragging && "opacity-50 cursor-grabbing",
                className,
              )}
            >
              {/* Full-size thumbnail background */}
              <ThumbnailImage src={thumbnailUrl} />

              {/* Subtle overlay for better text readability */}
              <div className="absolute inset-0 bg-black/20" />

              {/* Main clickable area - excludes the top-right corner for actions */}
              {/* biome-ignore lint/a11y/useButtonType: later */}
              <button
                className="absolute inset-0 right-10 focus:outline-none focus:ring-2 focus:ring-primary/50 rounded-lg"
                onClick={onClick}
              >
                <span className="sr-only">Open content group</span>
              </button>

              {/* Time overlay - top left */}
              {showTime && (
                <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm text-gray-900 px-2 py-1 rounded-md text-xs font-semibold shadow-sm pointer-events-none">
                  {formatTimeWithOptionalMinutes(eventData.start)}
                </div>
              )}

              {/* Group badge - top center */}
              <div className="absolute top-2 left-1/2 transform -translate-x-1/2 bg-white/90 backdrop-blur-sm text-gray-900 px-2 py-1 rounded-md text-xs font-semibold shadow-sm pointer-events-none">
                Group
              </div>

              {/* Platform stack - bottom right */}
              <div className="absolute bottom-2 right-2 flex gap-1 pointer-events-none">
                {platforms.slice(0, 2).map((platform) => {
                  const platformIcon = getPlatformIcon(platform);
                  return platformIcon ? (
                    <div
                      key={platform}
                      className="bg-white/95 backdrop-blur-sm rounded-full p-1.5 shadow-lg border border-white/20"
                    >
                      {platformIcon}
                    </div>
                  ) : null;
                })}
                {platforms.length > 2 && (
                  <div className="bg-white/95 backdrop-blur-sm rounded-full p-1.5 shadow-lg border border-white/20 flex items-center justify-center min-w-6 h-6">
                    <span className="text-xs font-semibold text-gray-900">
                      +{platforms.length - 2}
                    </span>
                  </div>
                )}
              </div>

              {/* Actions menu - top right - separate click area */}
              <div className="absolute top-0 right-0 w-10 h-10 flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <ContentActionsMenu
                    entity={event}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                </div>
              </div>

              {/* Message overlay - bottom with improved gradient */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 pt-8 pointer-events-none">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-white text-sm font-medium line-clamp-1 leading-snug drop-shadow-sm flex-1">
                    {primaryMessage || eventData.title}
                  </p>
                </div>
                {showTime && (
                  <p className="text-white/90 text-xs drop-shadow-sm">
                    {contents.length} post{contents.length !== 1 ? "s" : ""}
                  </p>
                )}
              </div>
            </div>
          );
        },
      })}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={showConfirm}
        onOpenChange={setShowConfirm}
        title={deleteConfig?.title}
        desc={deleteConfig?.description ?? "TODO"}
        confirmText={isDeleting ? "Deleting..." : "Delete"}
        destructive
        isLoading={isDeleting}
        handleConfirm={handleConfirm}
      />
    </>
  );
}
