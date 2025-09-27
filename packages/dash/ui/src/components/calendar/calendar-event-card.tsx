import type { PlacementSpec } from "@core/schemas/content.sql";
import { cn } from "@openpromo/ui/lib/utils";
import type { ContentEntity } from "@worker/routes/api/workspaces/content";
import { format, getMinutes } from "date-fns";
import { Eye, Heart, Image, MessageCircle } from "lucide-react";
import { type CalendarEvent, getEventData } from "@/components/calendar";
import { CalendarStatusBadge } from "@/components/calendar/calendar-status-badge";
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
          "w-full h-full flex items-center justify-center rounded-lg border border-border/60 bg-gradient-to-br from-muted/40 via-muted/20 to-background/60 dark:from-muted/20 dark:via-muted/10 dark:to-background/40 text-muted-foreground",
        )}
      >
        <div className="flex flex-col items-center gap-1.5 text-center">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-background/80 shadow-sm ring-1 ring-border/50 dark:bg-background/40">
            <Image className="h-4 w-4" />
          </span>
          <span className="text-xs font-medium text-muted-foreground">
            Preview unavailable
          </span>
          <span className="text-[10px] text-muted-foreground/80">
            Add media to see it here
          </span>
        </div>
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
            TTFeed: (s) => s.caption,
          });

          return (
            <div
              className={cn(
                "group w-full h-full rounded-lg transition-all relative overflow-hidden bg-white dark:bg-gray-800",
                "hover:bg-gray-50 dark:hover:bg-gray-750 min-h-[120px] border-[0.5px] border-gray-200 dark:border-gray-700",
                isDragging && "opacity-50 cursor-grabbing",
                className,
              )}
            >
              {/* Compact thumbnail - top portion */}
              {thumbnailSrc && (
                <div className="h-16 p-2 pb-0">
                  <ThumbnailImage
                    src={thumbnailSrc}
                    className="rounded-lg object-cover w-full h-full"
                  />
                </div>
              )}

              {/* Content area */}
              <div className="p-3 flex-1">
                {/* This will contain the message content */}
              </div>

              {/* Main clickable area - excludes the top-right corner for actions */}
              {/* biome-ignore lint/a11y/useButtonType: later */}
              <button
                className="absolute inset-0 right-10 focus:outline-none focus:ring-2 focus:ring-primary/50 rounded-lg"
                onClick={onClick}
              >
                <span className="sr-only">Open content</span>
              </button>

              {/* Time badge - top left */}
              {showTime && (
                <div className="absolute top-1.5 left-1.5 bg-white/20 dark:bg-black/20 backdrop-blur-sm text-gray-900 dark:text-white px-1.5 py-0.5 rounded text-[10px] font-medium pointer-events-none">
                  {formatTimeWithOptionalMinutes(eventData.start)}
                </div>
              )}

              {/* Platform icon - bottom right */}
              {platformIcon && (
                <div className="absolute bottom-2 right-2 bg-gray-100 dark:bg-gray-700 rounded-full p-1 pointer-events-none">
                  {platformIcon}
                </div>
              )}

              {/* Actions menu - top right */}
              <div className="absolute top-0 right-0 w-10 h-10 flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <ContentActionsMenu
                    entity={event}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                </div>
              </div>

              {/* Message content - in content area */}
              <div className="absolute bottom-3 left-3 right-12 pointer-events-none flex flex-col gap-1">
                <p className="text-gray-900 dark:text-gray-100 text-sm font-medium line-clamp-2 leading-snug">
                  {message || eventData.title}
                </p>
                {/* Engagement metrics for published content */}
                {entity.entity.publishingStatus === "PUBLISHED" && (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <Heart className="w-2.5 h-2.5 text-gray-400" />
                      <span className="text-[10px] text-gray-500 dark:text-gray-400">
                        24
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageCircle className="w-2.5 h-2.5 text-gray-400" />
                      <span className="text-[10px] text-gray-500 dark:text-gray-400">
                        3
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Eye className="w-2.5 h-2.5 text-gray-400" />
                      <span className="text-[10px] text-gray-500 dark:text-gray-400">
                        156
                      </span>
                    </div>
                  </div>
                )}
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
                  TTFeed: (s) => s.caption,
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
                "group w-full h-full rounded-lg transition-all relative overflow-hidden bg-white dark:bg-gray-800",
                "hover:bg-gray-50 dark:hover:bg-gray-750 min-h-[120px] border-[0.5px] border-gray-200 dark:border-gray-700",
                isDragging && "opacity-50 cursor-grabbing",
                className,
              )}
            >
              {/* Compact thumbnail - top portion */}
              {thumbnailUrl && (
                <div className="h-16 p-2 pb-0">
                  <ThumbnailImage
                    src={thumbnailUrl}
                    className="rounded-lg object-cover w-full h-full"
                  />
                </div>
              )}

              {/* Content area */}
              <div className="p-3 flex-1">
                {/* This will contain the message content */}
              </div>

              {/* Main clickable area - excludes the top-right corner for actions */}
              {/* biome-ignore lint/a11y/useButtonType: later */}
              <button
                className="absolute inset-0 right-10 focus:outline-none focus:ring-2 focus:ring-primary/50 rounded-lg"
                onClick={onClick}
              >
                <span className="sr-only">Open content group</span>
              </button>

              {/* Time badge - top left */}
              {showTime && (
                <div className="absolute top-1.5 left-1.5 bg-white/20 dark:bg-black/20 backdrop-blur-sm text-gray-900 dark:text-white px-1.5 py-0.5 rounded text-[10px] font-medium pointer-events-none">
                  {formatTimeWithOptionalMinutes(eventData.start)}
                </div>
              )}

              {/* Platform stack - bottom right */}
              <div className="absolute bottom-2 right-2 flex gap-1 pointer-events-none">
                {platforms.slice(0, 2).map((platform) => {
                  const platformIcon = getPlatformIcon(platform);
                  return platformIcon ? (
                    <div
                      key={platform}
                      className="bg-gray-100 dark:bg-gray-700 rounded-full p-1 shadow-sm"
                    >
                      {platformIcon}
                    </div>
                  ) : null;
                })}
                {platforms.length > 2 && (
                  <div className="bg-gray-100 dark:bg-gray-700 rounded-full p-1 shadow-sm flex items-center justify-center min-w-4 h-4">
                    <span className="text-[10px] font-semibold text-gray-900 dark:text-gray-100">
                      +{platforms.length - 2}
                    </span>
                  </div>
                )}
              </div>

              {/* Actions menu - top right */}
              <div className="absolute top-0 right-0 w-10 h-10 flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <ContentActionsMenu
                    entity={event}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                </div>
              </div>

              {/* Message content and count - in content area */}
              <div className="absolute bottom-3 left-3 right-12 pointer-events-none">
                <p className="text-gray-900 dark:text-gray-100 text-sm font-medium line-clamp-1 leading-snug mb-1">
                  {primaryMessage || eventData.title}
                </p>
                <div className="flex items-center gap-2">
                  {/* Status badge */}
                  <CalendarStatusBadge
                    status={entity.entity.publishingStatus}
                  />
                  <p className="text-gray-600 dark:text-gray-400 text-xs">
                    {contents.length} post{contents.length !== 1 ? "s" : ""}
                  </p>
                </div>
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
