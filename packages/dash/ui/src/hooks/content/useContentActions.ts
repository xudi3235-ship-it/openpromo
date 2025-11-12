import type { CalendarEvent } from "@/components/calendar";
import { matchEntity } from "@/lib/hono-client";
import {
  useContentDeleteMutation,
  useContentGroupDeleteMutation,
} from "@/queries/content-orpc";
import { useDialogComposerStore } from "@/stores/dialog-composer-store";

/**
 * Core hook for content actions - provides reusable business logic
 * for editing and deleting content entities across different contexts
 */
export const useContentActions = () => {
  const deleteContent = useContentDeleteMutation();
  const deleteContentGroup = useContentGroupDeleteMutation();
  const openDialog = useDialogComposerStore((state) => state.openDialog);

  const deleteEntity = async (entity: CalendarEvent): Promise<void> => {
    await matchEntity(entity, {
      content: (contentEntity) => {
        return deleteContent.mutateAsync({
          contentId: contentEntity.entity.id,
        });
      },
      group: (groupEntity) => {
        return deleteContentGroup.mutateAsync({
          contentGroupId: groupEntity.entity.id,
        });
      },
    });
  };

  const editEntity = (entity: CalendarEvent): void => {
    matchEntity(entity, {
      content: (contentEntity) => {
        const content = contentEntity.entity;
        openDialog(content.pendingContentGroupId || undefined);
      },
      group: (groupEntity) => {
        const group = groupEntity.entity;
        openDialog(group.id);
      },
    });
  };

  const getEntityId = (entity: CalendarEvent): string => {
    return matchEntity(entity, {
      content: (contentEntity) => contentEntity.entity.id,
      group: (groupEntity) => groupEntity.entity.id,
    });
  };

  return {
    deleteEntity,
    editEntity,
    getEntityId,
    isDeleting: deleteContent.isPending || deleteContentGroup.isPending,
  };
};
