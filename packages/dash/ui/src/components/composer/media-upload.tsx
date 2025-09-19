import type { SharedAttachmentSpec } from "@core/schemas/content.sql";
import { closestCenter, DndContext, DragOverlay } from "@dnd-kit/core";
import {
  horizontalListSortingStrategy,
  SortableContext,
} from "@dnd-kit/sortable";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@openpromo/ui/components/dialog";
import { Upload } from "lucide-react";
import { useState } from "react";
import { Dropzone } from "@/components/dropzone";
import { useAttachmentRenderer } from "@/hooks/useAttachmentRenderer";
import { useComposerMediaUploader } from "@/hooks/useComposerMediaUploader";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useComposerStore } from "@/stores/composer-store";
import { DraggableMediaItem } from "./draggable-media-item";

export function MediaUpload() {
  const { workspace } = useWorkspace();
  const { contentCreateData, removeAttachment, reorderAttachments } =
    useComposerStore();

  const attachments = contentCreateData.base.attachments ?? [];

  const { renderAttachment } = useAttachmentRenderer();

  const config = {
    maxFiles: 10,
    maxImageSize: 10 * 1024 * 1024,
    maxVideoSize: 100 * 1024 * 1024,
  };

  const { handleFiles } = useComposerMediaUploader({
    workspaceSlug: workspace?.slug,
    maxFiles: config.maxFiles,
    maxImageSize: config.maxImageSize,
    maxVideoSize: config.maxVideoSize,
  });

  const [selectedMedia, setSelectedMedia] = useState<{
    attachment: SharedAttachmentSpec;
    index: number;
  } | null>(null);

  const [dragOverlay, setDragOverlay] = useState<{
    attachment: SharedAttachmentSpec;
    index: number;
  } | null>(null);

  const getStableKey = (
    attachment: SharedAttachmentSpec,
    index: number,
  ): string => {
    return attachment.id || `media-${index}`;
  };

  const handleFileDrop = async (files: File[]) => {
    handleFiles(files);
  };

  const handleRemove = (index: number) => {
    removeAttachment(index);
  };

  const handleMediaClick = (
    attachment: SharedAttachmentSpec,
    index: number,
  ) => {
    setSelectedMedia({ attachment, index });
  };

  const handleDragStart = (event: import("@dnd-kit/core").DragStartEvent) => {
    const { active } = event;
    const index = attachments.findIndex(
      (attachment, idx) => getStableKey(attachment, idx) === active.id,
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
        (attachment, idx) => getStableKey(attachment, idx) === active.id,
      );
      const newIndex = attachments.findIndex(
        (attachment, idx) => getStableKey(attachment, idx) === over.id,
      );
      if (oldIndex !== -1 && newIndex !== -1) {
        reorderAttachments(oldIndex, newIndex);
      }
    }
  };

  const isAtLimit = attachments.length >= config.maxFiles;
  const remainingSlots = Math.max(config.maxFiles - attachments.length, 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">Media</h3>
        {attachments.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {attachments.length}/{config.maxFiles} files
          </span>
        )}
      </div>

      <div className="flex gap-2">
        <Dropzone
          accept={{ "image/*": [], "video/*": [] }}
          maxFiles={Math.max(remainingSlots, 1)}
          maxSize={Math.max(config.maxVideoSize, config.maxImageSize)}
          onDrop={handleFileDrop}
          disabled={isAtLimit}
          className={`${
            attachments.length === 0 ? "flex-1 h-16" : "flex-shrink-0 w-16 h-16"
          } border-dashed border-2 border-muted-foreground/25 hover:border-muted-foreground/50 transition-colors rounded-lg ${
            isAtLimit ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          <div className="flex items-center justify-center h-full text-muted-foreground gap-2">
            {attachments.length === 0 ? (
              <>
                <Upload className="h-4 w-4" />
                <span className="text-sm">Drop files or click to upload</span>
              </>
            ) : (
              <div className="flex flex-col items-center gap-1">
                <Upload className="h-3 w-3" />
                <span className="text-xs">{isAtLimit ? "Max" : "Add"}</span>
              </div>
            )}
          </div>
        </Dropzone>

        {attachments.length > 0 && (
          <div className="flex-1 overflow-x-auto">
            <DndContext
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={attachments.map((attachment, index) =>
                  getStableKey(attachment, index),
                )}
                strategy={horizontalListSortingStrategy}
              >
                <div className="flex gap-2">
                  {attachments.map((attachment, index) => {
                    const stableKey = getStableKey(attachment, index);

                    return (
                      <DraggableMediaItem
                        key={stableKey}
                        id={stableKey}
                        attachment={attachment}
                        index={index}
                        onRemove={handleRemove}
                        onClick={handleMediaClick}
                        renderAttachment={renderAttachment}
                      />
                    );
                  })}
                </div>
              </SortableContext>

              <DragOverlay>
                {dragOverlay && (
                  <div className="relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-muted opacity-80">
                    {renderAttachment(
                      dragOverlay.attachment,
                      "w-full h-full object-cover",
                    ) || (
                      <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                        No preview
                      </div>
                    )}
                  </div>
                )}
              </DragOverlay>
            </DndContext>
          </div>
        )}
      </div>

      {attachments.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Share photos and videos • Max {config.maxFiles} files • Images:{" "}
          {config.maxImageSize / (1024 * 1024)}MB • Videos:{" "}
          {config.maxVideoSize / (1024 * 1024)}MB
        </p>
      )}

      <Dialog
        open={!!selectedMedia}
        onOpenChange={() => setSelectedMedia(null)}
      >
        <DialogContent className="max-w-6xl max-h-[95vh] p-0">
          <DialogHeader className="p-4 pb-2">
            <DialogTitle>Media Details</DialogTitle>
          </DialogHeader>
          {selectedMedia && (
            <div className="flex flex-col overflow-hidden">
              <div className="flex-1 flex items-center justify-center p-4 bg-muted/20">
                {renderAttachment(
                  selectedMedia.attachment,
                  "max-h-[70vh] w-auto",
                  true,
                )}
              </div>

              {selectedMedia.attachment.file && (
                <div className="border-t p-6 space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Filename:</span>
                      <p className="font-medium">
                        {selectedMedia.attachment.file.name}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">File size:</span>
                      <p className="font-medium">
                        {(
                          selectedMedia.attachment.file.size /
                          1024 /
                          1024
                        ).toFixed(2)}{" "}
                        MB
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Type:</span>
                      <p className="font-medium">
                        {selectedMedia.attachment.file.type}
                      </p>
                    </div>
                    {selectedMedia.attachment.metadata?.aspectRatio && (
                      <div>
                        <span className="text-muted-foreground">
                          Aspect ratio:
                        </span>
                        <p className="font-medium">
                          {
                            selectedMedia.attachment.metadata
                              .aspectRatio as string
                          }
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {!selectedMedia.attachment.file &&
                selectedMedia.attachment.metadata?.previewIframeUrl && (
                  <div className="border-t p-4">
                    <p className="text-sm text-muted-foreground text-center">
                      {selectedMedia.attachment.metadata?.originalFilename ||
                        "Uploaded Video"}
                    </p>
                  </div>
                )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
