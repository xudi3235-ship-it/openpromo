import { Button } from "@openpromo/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@openpromo/ui/components/dropdown-menu";
import { cn } from "@openpromo/ui/lib/utils";
import type { PlacementSpec } from "@shared/content";
import type { ContentEntity } from "@worker/routes/api/workspaces/content";
import { format, getMinutes } from "date-fns";
import {
  CalendarClock,
  Edit,
  Eye,
  Heart,
  Image,
  MessageCircle,
  MoreHorizontal,
  Trash2,
  Upload,
} from "lucide-react";
import { type CalendarEvent, getEventData } from "@/components/calendar";
import { CalendarStatusBadge } from "@/components/calendar/calendar-status-badge";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { getPlatformIcon } from "@/components/content/utils/platform-icons";
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
    showConfirm,
    setShowConfirm,
    deleteConfig,
    handleConfirm,
    isDeleting,
  } = useCalendarActions(onDelete);

  const contentPermalink = getPermalink(event);
  const isEditable = isEntityEditable(event);
  const canPublish = canEntityPublish(event);
  const editLabel = getEditLabel(event);
  const deleteLabel = getDeleteLabel(event);

  const renderActionsMenu = () => (
    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 rounded-full bg-gray-200/80 dark:bg-gray-700/80 p-0 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={4} className="w-44">
          <DropdownMenuItem
            onClick={(e) => handleView(event, e)}
            disabled={!contentPermalink}
          >
            <Eye className="w-4 h-4 mr-2" /> View content
          </DropdownMenuItem>
          {isEditable && (
            <DropdownMenuItem onClick={(e) => handleEdit(event, e)}>
              <Edit className="w-4 h-4 mr-2" />
              {editLabel}
            </DropdownMenuItem>
          )}
          {canReschedule(event) && (
            <DropdownMenuItem onClick={(e) => handleReschedule(event, e)}>
              <CalendarClock className="w-4 h-4 mr-2" /> Reschedule
            </DropdownMenuItem>
          )}
          {canPublish && (
            <DropdownMenuItem
              onClick={(e) => handlePublish(event, e)}
              disabled={isPublishing}
            >
              <Upload className="w-4 h-4 mr-2" />
              {isPublishing ? "Publishing..." : "Publish now"}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onClick={(e) => handleDelete(event, e)}
            className="text-destructive"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {deleteLabel}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

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
                "hover:bg-gray-50 dark:hover:bg-gray-750 min-h-[150px] border-[0.5px] border-gray-200 dark:border-gray-700",
                "flex flex-col",
                isDragging && "opacity-50 cursor-grabbing",
                className,
              )}
            >
              {/* Header with time badge and actions */}
              <div className="relative flex items-center justify-between px-2 pt-1.5 pb-1 z-10">
                {/* Time badge */}
                {showTime && (
                  <div className="bg-gray-100/80 dark:bg-gray-700/80 text-gray-900 dark:text-white px-1.5 py-0.5 rounded text-[10px] font-medium pointer-events-none">
                    {formatTimeWithOptionalMinutes(eventData.start)}
                  </div>
                )}
                <div className="flex-1" />
                {/* Actions menu */}
                <div>{renderActionsMenu()}</div>
              </div>

              {/* Thumbnail section */}
              {thumbnailSrc && (
                <div className="px-2 pb-2">
                  <div className="relative h-16 rounded-md overflow-hidden">
                    <ThumbnailImage
                      src={thumbnailSrc}
                      className="rounded-md object-cover w-full h-full"
                    />
                  </div>
                </div>
              )}

              {/* Content section - grows to fill space */}
              <div className="flex-1 px-2 pb-2 flex flex-col justify-between min-h-0">
                {/* Message */}
                <p className="text-gray-900 dark:text-gray-100 text-xs font-medium line-clamp-2 leading-snug mb-2">
                  {message || eventData.title}
                </p>

                {/* Footer with metrics and platform */}
                <div className="flex items-end justify-between gap-2 mt-auto">
                  {/* Engagement metrics for published content */}
                  {entity.entity.publishingStatus === "PUBLISHED" &&
                  entity.entity.metrics ? (
                    <div className="flex items-center gap-2 flex-wrap">
                      {entity.entity.metrics.likes != null &&
                        entity.entity.metrics.likes > 0 && (
                          <div className="flex items-center gap-0.5">
                            <Heart className="w-3 h-3 text-gray-400" />
                            <span className="text-[10px] text-gray-500 dark:text-gray-400">
                              {entity.entity.metrics.likes.toLocaleString()}
                            </span>
                          </div>
                        )}
                      {entity.entity.metrics.comments != null &&
                        entity.entity.metrics.comments > 0 && (
                          <div className="flex items-center gap-0.5">
                            <MessageCircle className="w-3 h-3 text-gray-400" />
                            <span className="text-[10px] text-gray-500 dark:text-gray-400">
                              {entity.entity.metrics.comments.toLocaleString()}
                            </span>
                          </div>
                        )}
                      {entity.entity.metrics.reach != null &&
                        entity.entity.metrics.reach > 0 && (
                          <div className="flex items-center gap-0.5">
                            <Eye className="w-3 h-3 text-gray-400" />
                            <span className="text-[10px] text-gray-500 dark:text-gray-400">
                              {entity.entity.metrics.reach.toLocaleString()}
                            </span>
                          </div>
                        )}
                    </div>
                  ) : (
                    <div />
                  )}

                  {/* Platform icon */}
                  {platformIcon && (
                    <div className="flex-shrink-0 bg-gray-100 dark:bg-gray-700 rounded-full p-1">
                      {platformIcon}
                    </div>
                  )}
                </div>
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
                "hover:bg-gray-50 dark:hover:bg-gray-750 min-h-[150px] border-[0.5px] border-gray-200 dark:border-gray-700",
                "flex flex-col",
                isDragging && "opacity-50 cursor-grabbing",
                className,
              )}
            >
              {/* Header with time badge and actions */}
              <div className="relative flex items-center justify-between px-2 pt-1.5 pb-1 z-10">
                {/* Time badge */}
                {showTime && (
                  <div className="bg-gray-100/80 dark:bg-gray-700/80 text-gray-900 dark:text-white px-1.5 py-0.5 rounded text-[10px] font-medium pointer-events-none">
                    {formatTimeWithOptionalMinutes(eventData.start)}
                  </div>
                )}
                <div className="flex-1" />
                {/* Actions menu */}
                <div>{renderActionsMenu()}</div>
              </div>

              {/* Thumbnail section */}
              {thumbnailUrl && (
                <div className="px-2 pb-2">
                  <div className="relative h-16 rounded-md overflow-hidden">
                    <ThumbnailImage
                      src={thumbnailUrl}
                      className="rounded-md object-cover w-full h-full"
                    />
                  </div>
                </div>
              )}

              {/* Content section - grows to fill space */}
              <div className="flex-1 px-2 pb-2 flex flex-col justify-between min-h-0">
                {/* Message */}
                <p className="text-gray-900 dark:text-gray-100 text-xs font-medium line-clamp-2 leading-snug mb-2">
                  {primaryMessage || eventData.title}
                </p>

                {/* Footer with status badge, post count, and platforms */}
                <div className="flex items-end justify-between gap-2 mt-auto">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Status badge */}
                    <CalendarStatusBadge
                      status={entity.entity.publishingStatus}
                    />
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
