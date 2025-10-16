import { useMemo } from "react";
import { useAttachmentRenderer } from "@/hooks/useAttachmentRenderer";
import { useComposerStore } from "@/stores/composer-store";
import { useMediaUIStore } from "@/stores/media-ui-store";
import { MediaDetailDialog } from "./media-detail-dialog";
import { MediaEditDialog } from "./media-edit-dialog";

function MediaSectionDialogs() {
  const { contentCreateData } = useComposerStore();
  const { selectedMedia, setSelectedMedia, editingMedia, setEditingMedia } =
    useMediaUIStore();

  const attachments = useMemo(
    () => contentCreateData.base.attachments ?? [],
    [contentCreateData.base.attachments],
  );

  const { renderAttachment } = useAttachmentRenderer({ attachments });

  return (
    <>
      <MediaDetailDialog
        selected={selectedMedia}
        onClose={() => setSelectedMedia(null)}
        renderAttachment={renderAttachment}
      />
      <MediaEditDialog
        editing={editingMedia}
        onClose={() => setEditingMedia(null)}
        renderAttachment={renderAttachment}
      />
    </>
  );
}

Object.assign(MediaSectionDialogs, { displayName: "MediaSectionDialogs" });

export { MediaSectionDialogs };
