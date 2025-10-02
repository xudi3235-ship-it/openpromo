import type React from "react";
import { toast } from "sonner";
import type { CalendarEvent } from "@/components/calendar";
import { matchEntity } from "@/lib/hono-client";
import { useContentGroupPublishMutation } from "@/queries/content";
import { useContentActions } from "./useContentActions";
import { useDeleteConfirmation } from "./useDeleteConfirmation";

interface UseContentActionControllerOptions {
  onDelete?: (entityId: string) => void;
  stopPropagation?: boolean;
}

type ActionHandler = (entity: CalendarEvent, e?: React.MouseEvent) => void;

export const useContentActionController = ({
  onDelete,
  stopPropagation = false,
}: UseContentActionControllerOptions = {}) => {
  const { editEntity } = useContentActions();
  const publishContentGroup = useContentGroupPublishMutation();
  const confirmation = useDeleteConfirmation(onDelete);

  const maybeStopPropagation = (event?: React.MouseEvent) => {
    if (stopPropagation) {
      event?.stopPropagation();
    }
  };

  const getPermalink = (entity: CalendarEvent): string | null => {
    return matchEntity(entity, {
      content: (contentEntity) => {
        const content = contentEntity.entity;
        if (content.permalinkUrl) return content.permalinkUrl;

        const placementSpec = content.placementSpec as
          | {
              identity?: {
                metadata?: Record<string, unknown>;
                fbPageID?: string;
              };
            }
          | undefined;

        const metadata =
          (placementSpec?.identity?.metadata as
            | Record<string, unknown>
            | undefined) ?? {};

        const metadataUrl =
          metadata?.["permalinkUrl"] ??
          metadata?.["shareUrl"] ??
          metadata?.["permalink"];

        if (typeof metadataUrl === "string") return metadataUrl;
        return null;
      },
      group: () => null,
    });
  };

  const handleView: ActionHandler = (entity, event) => {
    maybeStopPropagation(event);
    const permalink = getPermalink(entity);
    if (!permalink) {
      toast.info("No permalink available yet.");
      return;
    }

    if (typeof window !== "undefined") {
      window.open(permalink, "_blank", "noopener,noreferrer");
    }
  };

  const handleEdit: ActionHandler = (entity, event) => {
    maybeStopPropagation(event);
    editEntity(entity);
  };

  const handleDelete: ActionHandler = (entity, event) => {
    maybeStopPropagation(event);
    confirmation.confirmDelete(entity);
  };

  const handlePublish: ActionHandler = (entity, event) => {
    maybeStopPropagation(event);
    matchEntity(entity, {
      content: (contentEntity) => {
        const content = contentEntity.entity;
        if (!content.pendingContentGroupId) return;

        publishContentGroup.mutate(content.pendingContentGroupId, {
          onSuccess: () => {
            toast.success("Content published successfully!");
          },
          onError: () => {
            toast.error("Failed to publish content. Please try again.");
          },
        });
      },
      group: (groupEntity) => {
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

  const publishingStatus = (entity: CalendarEvent) =>
    matchEntity(entity, {
      content: (contentEntity) => contentEntity.entity.publishingStatus,
      group: (groupEntity) => groupEntity.entity.publishingStatus,
    });

  const isEditable = (entity: CalendarEvent) => {
    const status = publishingStatus(entity);
    return status === "DRAFT" || status === "SCHEDULED";
  };

  const canPublish = (entity: CalendarEvent) => {
    const status = publishingStatus(entity);
    return status === "DRAFT" || status === "SCHEDULED";
  };

  const editLabel = (entity: CalendarEvent) =>
    matchEntity(entity, {
      content: () => "Edit content",
      group: () => "Edit group",
    });

  const deleteLabel = (entity: CalendarEvent) =>
    matchEntity(entity, {
      content: () => "Delete content",
      group: () => "Delete group",
    });

  return {
    handleEdit,
    handleDelete,
    handleView,
    handlePublish,
    getPermalink,
    publishingStatus,
    isEditable,
    canPublish,
    editLabel,
    deleteLabel,
    isPublishing: publishContentGroup.isPending,
    ...confirmation,
  };
};
