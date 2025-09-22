import { useState } from "react";
import type { CalendarEvent } from "@/components/calendar";
import { matchEntity } from "@/lib/hono-client";
import { useContentActions } from "./useContentActions";

interface DeleteConfig {
  title: string;
  description: string;
  action: () => Promise<void>;
}

/**
 * Hook for managing delete confirmation dialog state and logic
 * Generates appropriate confirmation messages based on content type and status
 */
export const useDeleteConfirmation = (
  onComplete?: (entityId: string) => void,
) => {
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleteConfig, setDeleteConfig] = useState<DeleteConfig | null>(null);
  const { deleteEntity, getEntityId, isDeleting } = useContentActions();

  const generateDeleteConfig = (
    entity: CalendarEvent,
  ): Omit<DeleteConfig, "action"> => {
    return matchEntity(entity, {
      content: (contentEntity) => {
        const content = contentEntity.entity;
        const isDraft = content.publishingStatus === "DRAFT";
        const isScheduled = content.publishingStatus === "SCHEDULED";
        const isPublished = content.publishingStatus === "PUBLISHED";

        const titleBase =
          content.placement === "IG_FEED"
            ? "Delete Instagram Post"
            : content.placement === "FB_FEED"
              ? "Delete Facebook Post"
              : "Delete Content";

        if (isPublished) {
          const description =
            content.placement === "IG_FEED"
              ? "This content has already been published to Instagram. Deleting it will remove it from OpenPromo, but it will remain visible on Instagram."
              : "This content has already been published. Deleting it will remove it from OpenPromo and attempt to remove the post from the connected platform.";

          return {
            title: titleBase,
            description,
          };
        }

        if (isScheduled) {
          return {
            title: `${titleBase} (Scheduled)`,
            description:
              "This content is scheduled to publish. Deleting it will cancel the upcoming publish and remove it from OpenPromo.",
          };
        }

        if (isDraft) {
          return {
            title: `${titleBase} (Draft)`,
            description:
              "This draft will be removed from OpenPromo. You'll need to recreate it if you change your mind.",
          };
        }

        return {
          title: titleBase,
          description:
            "Are you sure you want to delete this content? This action cannot be undone.",
        };
      },
      group: () => ({
        title: "Delete Content Group",
        description:
          "Are you sure you want to delete this content group? This will permanently delete all content in the group and cannot be undone.",
      }),
    });
  };

  const confirmDelete = (entity: CalendarEvent) => {
    const config = generateDeleteConfig(entity);
    const entityId = getEntityId(entity);

    setDeleteConfig({
      ...config,
      action: async () => {
        await deleteEntity(entity);
        onComplete?.(entityId);
        setShowConfirm(false);
      },
    });
    setShowConfirm(true);
  };

  const handleConfirm = async () => {
    if (deleteConfig) {
      await deleteConfig.action();
      setDeleteConfig(null);
    }
  };

  return {
    showConfirm,
    setShowConfirm,
    deleteConfig,
    confirmDelete,
    handleConfirm,
    isDeleting,
  };
};
