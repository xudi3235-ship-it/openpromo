import type { MergedContentEntity } from "@worker/routes/api/workspaces/content";
import { format } from "date-fns";
import { useCallback, useEffect } from "react";
import { toast } from "sonner";
import { getEventData } from "@/components/calendar";
import { matchEntity } from "@/lib/hono-client";
import type { CalendarReschedulePayload } from "@/stores/calendar-reschedule-store";
import { useCalendarRescheduleStore } from "@/stores/calendar-reschedule-store";
import { useDialogComposerStore } from "@/stores/dialog-composer-store";

export type RescheduleState = CalendarReschedulePayload;

interface UseCalendarDragUpdateArgs {
  onEventUpdate?: (
    event: MergedContentEntity,
    context?: { proposedPublishAt?: Date },
  ) => void;
}

interface UseCalendarDragUpdateResult {
  handleEventUpdate: (
    event: MergedContentEntity,
    context?: { proposedPublishAt?: Date },
  ) => void;
  rescheduleState: RescheduleState | null;
  closeRescheduleDialog: () => void;
  openComposerForReschedule: () => void;
}

export function resolveProposedPublishAtForEvent(
  updatedEvent: MergedContentEntity,
): Date {
  let resolved: Date | null = null;

  matchEntity(updatedEvent, {
    group: (groupEntity) => {
      const schedule =
        groupEntity.entity?.pendingContentGroupSpec?.baseSchedulingSpec;
      const raw = schedule?.publishAt;
      if (raw) resolved = new Date(raw);
    },
    content: (contentEntity) => {
      const entity = contentEntity.entity as {
        schedulingSpec?: { scheduledPublishAt?: string; publishAt?: string };
        placementSpec?: { schedulingSpec?: { publishAt?: string } };
      };

      const raw =
        entity.schedulingSpec?.scheduledPublishAt ??
        entity.schedulingSpec?.publishAt ??
        entity.placementSpec?.schedulingSpec?.publishAt;

      if (raw) resolved = new Date(raw);
    },
  });

  if (resolved) return resolved;
  return getEventData(updatedEvent).start;
}

export function resolveRescheduleGroupId(
  updatedEvent: MergedContentEntity,
): string | undefined {
  return matchEntity(updatedEvent, {
    group: (groupEntity) => groupEntity.entity.id,
    content: (contentEntity) =>
      contentEntity.entity.pendingContentGroupId ?? undefined,
  });
}

export function useCalendarDragUpdate(
  args: UseCalendarDragUpdateArgs,
): UseCalendarDragUpdateResult {
  const { onEventUpdate } = args;
  const openComposerDialog = useDialogComposerStore(
    (state) => state.openDialog,
  );

  const rescheduleState = useCalendarRescheduleStore((state) => state.state);
  const openReschedule = useCalendarRescheduleStore((state) => state.open);
  const closeReschedule = useCalendarRescheduleStore((state) => state.close);

  const closeRescheduleDialog = useCallback(() => {
    closeReschedule();
  }, [closeReschedule]);

  const openComposerForReschedule = useCallback(() => {
    if (rescheduleState?.groupId) {
      openComposerDialog(rescheduleState.groupId);
    }
    closeReschedule();
  }, [closeReschedule, openComposerDialog, rescheduleState]);

  const handleEventUpdate = useCallback(
    (
      updatedEvent: MergedContentEntity,
      context?: { proposedPublishAt?: Date },
    ) => {
      onEventUpdate?.(updatedEvent, context);

      const publishAt =
        context?.proposedPublishAt ??
        resolveProposedPublishAtForEvent(updatedEvent);

      let handledBySpecialFlow = false;

      matchEntity(updatedEvent, {
        group: (groupEntity) => {
          const { id, publishingStatus } = groupEntity.entity;
          if (publishingStatus === "SCHEDULED") {
            openReschedule({
              event: updatedEvent,
              proposedPublishAt: publishAt,
              groupId: id,
            });
            handledBySpecialFlow = true;
            return;
          }

          if (publishingStatus === "DRAFT") {
            openComposerDialog(id);
            handledBySpecialFlow = true;
          }
        },
        content: (contentEntity) => {
          const { publishingStatus, pendingContentGroupId } =
            contentEntity.entity;

          if (publishingStatus === "SCHEDULED" && pendingContentGroupId) {
            openReschedule({
              event: updatedEvent,
              proposedPublishAt: publishAt,
              groupId: pendingContentGroupId,
            });
            handledBySpecialFlow = true;
            return;
          }

          if (publishingStatus === "DRAFT" && pendingContentGroupId) {
            openComposerDialog(pendingContentGroupId);
            handledBySpecialFlow = true;
          }
        },
      });

      if (!handledBySpecialFlow) {
        toast("Content moved", {
          description: format(new Date(), "MMM d, yyyy"),
          position: "bottom-left",
        });
      }
    },
    [onEventUpdate, openComposerDialog, openReschedule],
  );

  useEffect(() => {
    if (rescheduleState) {
      toast.dismiss();
    }
  }, [rescheduleState]);

  return {
    handleEventUpdate,
    rescheduleState,
    closeRescheduleDialog,
    openComposerForReschedule,
  };
}
