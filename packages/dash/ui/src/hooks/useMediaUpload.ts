import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import { useState } from "react";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useComposerStore } from "@/stores/composer-store";
import { useFileValidation } from "./useFileValidation";
import { type MediaPreview, useMediaPreviews } from "./useMediaPreviews";

export function useMediaUpload() {
  const {
    contentCreateData,
    removeAttachment,
    uploadAttachments,
    reorderAttachments,
  } = useComposerStore();

  const { workspace } = useWorkspace();
  const { validateFiles, config } = useFileValidation();
  const { previews, getStableKey } = useMediaPreviews(
    contentCreateData.base.attachments,
  );

  const [selectedMedia, setSelectedMedia] = useState<{
    preview: MediaPreview;
    index: number;
  } | null>(null);

  const [dragOverlay, setDragOverlay] = useState<{
    preview: MediaPreview;
    index: number;
  } | null>(null);

  // Enhanced file drop handler with validation
  const handleFileDrop = async (files: File[]) => {
    if (!workspace?.slug) return;

    const { validFiles, errors } = validateFiles(files);

    // Log errors for invalid files (could show toasts here)
    if (errors.length > 0) {
      console.error("File validation errors:", errors);
      // TODO: Show toast notifications for validation errors
    }

    // Upload valid files
    if (validFiles.length > 0) {
      await uploadAttachments(validFiles, workspace.slug);
    }
  };

  const handleRemove = (index: number) => {
    const preview = previews[index];
    if (preview?.url.startsWith("blob:")) URL.revokeObjectURL(preview.url);
    removeAttachment(index);
  };

  const handleMediaClick = (preview: MediaPreview, index: number) => {
    setSelectedMedia({ preview, index });
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    // Find index by matching the stable key
    const index = previews.findIndex(
      (preview, idx) => getStableKey(preview, idx) === active.id,
    );

    if (index !== -1) {
      setDragOverlay({ preview: previews[index], index });
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    setDragOverlay(null);

    if (over && active.id !== over.id) {
      // Find indices by matching stable keys
      const oldIndex = previews.findIndex(
        (preview, idx) => getStableKey(preview, idx) === active.id,
      );

      const newIndex = previews.findIndex(
        (preview, idx) => getStableKey(preview, idx) === over.id,
      );

      if (oldIndex !== -1 && newIndex !== -1) {
        reorderAttachments(oldIndex, newIndex);
      }
    }
  };

  return {
    // State
    previews,
    selectedMedia,
    dragOverlay,
    attachments: contentCreateData.base.attachments,
    config,

    // Actions
    handleFileDrop,
    handleRemove,
    handleMediaClick,
    handleDragStart,
    handleDragEnd,
    setSelectedMedia,
    getStableKey,
  };
}
