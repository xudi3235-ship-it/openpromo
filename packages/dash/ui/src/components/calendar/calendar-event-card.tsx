import { type CalendarEvent, getEventData } from "@/components/calendar";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { getPlatformIcon } from "@/components/content/utils/platform-icons";
import { useCalendarActions } from "@/hooks/content";
import { matchEntity } from "@/lib/hono-client";
import { CalendarEventCardActionsMenu } from "./calendar-event-card-actions-menu";
import { CalendarEventCardContent } from "./calendar-event-card-content";
import { CalendarEventCardGroup } from "./calendar-event-card-group";

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

  return (
    <>
      {matchEntity(event, {
        content: (entity) => {
          const platformIcon = getPlatformIcon(entity.entity.placement);

          return (
            <CalendarEventCardContent
              entity={entity}
              title={eventData.title}
              startTime={eventData.start}
              platformIcon={platformIcon}
              showTime={showTime}
              isDragging={isDragging}
              className={className}
              renderActionsMenu={renderActionsMenu}
              onClick={onClick}
            />
          );
        },
        group: (entity) => {
          return (
            <CalendarEventCardGroup
              entity={entity}
              title={eventData.title}
              startTime={eventData.start}
              showTime={showTime}
              isDragging={isDragging}
              className={className}
              renderActionsMenu={renderActionsMenu}
              onClick={onClick}
            />
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
