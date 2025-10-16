import type { SharedAttachmentSpec } from "@shared/content";
import { useMemo } from "react";
import { useAttachmentRenderer } from "@/hooks/useAttachmentRenderer";
import { useComposerStore } from "@/stores/composer-store";
import { useMediaUIStore } from "@/stores/media-ui-store";
import { MediaCompactView } from "./media-compact-view";
import { MediaListView } from "./media-list-view";

function MediaSectionGallery() {
  const { contentCreateData, removeAttachment, reorderAttachments } =
    useComposerStore();
  const {
    viewMode,
    setSelectedMedia,
    setEditingMedia,
    dragOverlay,
    setDragOverlay,
  } = useMediaUIStore();

  const attachments = useMemo(
    () => contentCreateData.base.attachments ?? [],
    [contentCreateData.base.attachments],
  );

  const { renderAttachment } = useAttachmentRenderer({ attachments });

  const getStableKey = (
    attachment: SharedAttachmentSpec,
    index: number,
  ): string => {
    return attachment.id || `media-${index}`;
  };

  const handleDragStart = (event: import("@dnd-kit/core").DragStartEvent) => {
    const { active } = event;
    const index = attachments.findIndex(
      (attachment: SharedAttachmentSpec, idx: number) =>
        getStableKey(attachment, idx) === active.id,
    );
    if (index !== -1) {
      setDragOverlay({ attachment: attachments[index], index });
    }
  };

  const handleDragEnd = (event: import("@dnd-kit/core").DragEndEvent) => {
    const { active, over } = event;
    setDragOverlay(null);

    if (over && active.id !== over.id) {
      const oldIndex = attachments.findIndex(
        (attachment: SharedAttachmentSpec, idx: number) =>
          getStableKey(attachment, idx) === active.id,
      );
      const newIndex = attachments.findIndex(
        (attachment: SharedAttachmentSpec, idx: number) =>
          getStableKey(attachment, idx) === over.id,
      );
      if (oldIndex !== -1 && newIndex !== -1) {
        reorderAttachments(oldIndex, newIndex);
      }
    }
  };

  if (attachments.length === 0) return null;

  return viewMode === "compact" ? (
    <MediaCompactView
      attachments={attachments}
      getStableKey={getStableKey}
      dragOverlay={dragOverlay}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onRemove={removeAttachment}
      onPreview={(attachment, index) => setSelectedMedia({ attachment, index })}
      renderAttachment={renderAttachment}
    />
  ) : (
    <MediaListView
      attachments={attachments}
      getStableKey={getStableKey}
      dragOverlay={dragOverlay}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onRemove={removeAttachment}
      onPreview={(attachment, index) => setSelectedMedia({ attachment, index })}
      onEdit={(attachment, index) => setEditingMedia({ attachment, index })}
      renderAttachment={renderAttachment}
    />
  );
}

export { MediaSectionGallery };
