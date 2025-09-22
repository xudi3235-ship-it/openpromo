import { toast } from "sonner";
import type { CalendarEvent } from "@/components/calendar";
import { matchEntity } from "@/lib/hono-client";
import { useContentGroupPublishMutation } from "@/queries/content";
import { useContentActions } from "./useContentActions";
import { useDeleteConfirmation } from "./useDeleteConfirmation";

/**
 * Table-specific hook for content actions
 * Includes publish functionality and table-specific behaviors
 */
export const useTableActions = () => {
  const { editEntity } = useContentActions();
  const publishContentGroup = useContentGroupPublishMutation();
  const confirmation = useDeleteConfirmation();

  const handleEdit = (entity: CalendarEvent) => {
    editEntity(entity);
  };

  const handleDelete = (entity: CalendarEvent) => {
    confirmation.confirmDelete(entity);
  };

  const handlePublish = (entity: CalendarEvent) => {
    matchEntity(entity, {
      content: (contentEntity) => {
        // For individual content, publish its parent group
        const content = contentEntity.entity;
        if (content.pendingContentGroupId) {
          publishContentGroup.mutate(content.pendingContentGroupId, {
            onSuccess: () => {
              toast.success("Content published successfully!");
            },
            onError: () => {
              toast.error("Failed to publish content. Please try again.");
            },
          });
        }
      },
      group: (groupEntity) => {
        // For groups, publish the group directly
        const group = groupEntity.entity;
        publishContentGroup.mutate(group.id, {
          onSuccess: () => {
            toast.success("Content group published successfully!");
          },
          onError: () => {
            toast.error("Failed to publish content group. Please try again.");
          },
        });
      },
    });
  };

  const copyEntityId = (entity: CalendarEvent) => {
    navigator.clipboard.writeText(entity.entity.id);
  };

  return {
    handleEdit,
    handleDelete,
    handlePublish,
    copyEntityId,
    isPublishing: publishContentGroup.isPending,
    ...confirmation,
  };
};
