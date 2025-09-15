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
import { useMemo, useState } from "react";
import { Dropzone } from "@/components/dropzone";
import { useWorkspace } from "@/hooks/useWorkspace";
import { MediaRenderer, MediaService } from "@/lib/media";
import { useComposerStore } from "@/stores/composer-store";
import { DraggableMediaItem } from "./draggable-media-item";

export function MediaUpload() {
  const { workspace } = useWorkspace();
  const {
    contentCreateData,
    uploadAttachments,
    removeAttachment,
    reorderAttachments,
  } = useComposerStore();

  // Convert attachments to media items for unified rendering (memoized to prevent flicker)
  const mediaItems = useMemo(
    () =>
      MediaService.fromAttachments(contentCreateData.base.attachments || []),
    [contentCreateData.base.attachments],
  );

  // Local state for dialog and drag overlay
  const [selectedMedia, setSelectedMedia] = useState<{
    item: import("@/lib/media").MediaItem;
    index: number;
  } | null>(null);

  const [dragOverlay, setDragOverlay] = useState<{
    item: import("@/lib/media").MediaItem;
    index: number;
  } | null>(null);

  // Configuration
  const config = {
    maxFiles: 10,
    maxImageSize: 10 * 1024 * 1024,
    maxVideoSize: 100 * 1024 * 1024,
  };

  // Helper to get stable key for drag and drop
  const getStableKey = (
    item: import("@/lib/media").MediaItem,
    index: number,
  ): string => {
    return item.id || `media-${index}`;
  };

  // Event handlers
  const handleFileDrop = async (files: File[]) => {
    if (!workspace?.slug) return;
    await uploadAttachments(files, workspace.slug);
  };

  const handleRemove = (index: number) => {
    removeAttachment(index);
  };

  const handleMediaClick = (
    item: import("@/lib/media").MediaItem,
    index: number,
  ) => {
    setSelectedMedia({ item, index });
  };

  const handleDragStart = (event: import("@dnd-kit/core").DragStartEvent) => {
    const { active } = event;
    const index = mediaItems.findIndex(
      (item, idx) => getStableKey(item, idx) === active.id,
    );
    if (index !== -1) {
      setDragOverlay({ item: mediaItems[index], index });
    }
  };

  const handleDragEnd = (event: import("@dnd-kit/core").DragEndEvent) => {
    const { active, over } = event;
    setDragOverlay(null);

    if (over && active.id !== over.id) {
      const oldIndex = mediaItems.findIndex(
        (item, idx) => getStableKey(item, idx) === active.id,
      );
      const newIndex = mediaItems.findIndex(
        (item, idx) => getStableKey(item, idx) === over.id,
      );
      if (oldIndex !== -1 && newIndex !== -1) {
        reorderAttachments(oldIndex, newIndex);
      }
    }
  };

  return (
    <div className="space-y-3">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">Media</h3>
        {mediaItems.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {mediaItems.length}/{config.maxFiles} files
          </span>
        )}
      </div>

      {/* Horizontal Media Row */}
      <div className="flex gap-2">
        {/* Add Button - Full width when no media, compact when media exists */}
        <Dropzone
          accept={{ "image/*": [], "video/*": [] }}
          maxFiles={config.maxFiles}
          maxSize={Math.max(config.maxVideoSize, config.maxImageSize)}
          onDrop={handleFileDrop}
          className={`${
            mediaItems.length === 0 ? "flex-1 h-16" : "flex-shrink-0 w-16 h-16"
          } border-dashed border-2 border-muted-foreground/25 hover:border-muted-foreground/50 transition-colors rounded-lg`}
        >
          <div className="flex items-center justify-center h-full text-muted-foreground gap-2">
            {mediaItems.length === 0 ? (
              <>
                <Upload className="h-4 w-4" />
                <span className="text-sm">Drop files or click to upload</span>
              </>
            ) : (
              <div className="flex flex-col items-center gap-1">
                <Upload className="h-3 w-3" />
                <span className="text-xs">Add</span>
              </div>
            )}
          </div>
        </Dropzone>

        {/* Scrollable Draggable Thumbnails */}
        {mediaItems.length > 0 && (
          <div className="flex-1 overflow-x-auto">
            <DndContext
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={mediaItems.map((item, index) =>
                  getStableKey(item, index),
                )}
                strategy={horizontalListSortingStrategy}
              >
                <div className="flex gap-2">
                  {mediaItems.map((item, index) => {
                    const attachmentSpec = MediaService.toAttachmentSpecs([
                      item,
                    ])[0];
                    if (!attachmentSpec) return null;

                    const stableKey = getStableKey(item, index);

                    // Create a legacy preview object for DraggableMediaItem compatibility
                    const legacyPreview = {
                      file: item.file || ({} as File),
                      url: item.urls.preview,
                      aspectRatio: item.aspectRatio || "16:9",
                      mimeType: item.mimeType,
                      previewIframeUrl: item.urls.playback,
                      isStreamVideo:
                        item.state === "uploaded" && !!item.urls.playback,
                    };

                    return (
                      <DraggableMediaItem
                        key={stableKey}
                        id={stableKey}
                        preview={legacyPreview}
                        attachment={attachmentSpec}
                        index={index}
                        onRemove={handleRemove}
                        onClick={(_, idx) => handleMediaClick(item, idx)}
                      />
                    );
                  })}
                </div>
              </SortableContext>

              {/* Drag Overlay */}
              <DragOverlay>
                {dragOverlay && (
                  <div className="relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-muted opacity-80">
                    {MediaRenderer.renderThumbnail(
                      dragOverlay.item,
                      "w-full h-full object-cover",
                    )}
                  </div>
                )}
              </DragOverlay>
            </DndContext>
          </div>
        )}
      </div>

      {/* Help Text */}
      {mediaItems.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Share photos and videos • Max {config.maxFiles} files • Images:{" "}
          {config.maxImageSize / (1024 * 1024)}MB • Videos:{" "}
          {config.maxVideoSize / (1024 * 1024)}MB
        </p>
      )}

      {/* Media Detail Dialog */}
      <Dialog
        open={!!selectedMedia}
        onOpenChange={() => setSelectedMedia(null)}
      >
        <DialogContent className="max-w-6xl max-h-[95vh] p-0">
          <DialogHeader className="p-4 pb-2">
            <DialogTitle>
              {selectedMedia?.item.state === "uploaded" &&
              selectedMedia?.item.urls.playback
                ? "Video Player"
                : "Media Details"}
            </DialogTitle>
          </DialogHeader>
          {selectedMedia && (
            <div className="flex flex-col overflow-hidden">
              {/* Media Display */}
              <div className="flex-1 flex items-center justify-center p-4 bg-muted/20">
                {MediaRenderer.renderPlayer(selectedMedia.item)}
              </div>

              {/* Media Info - Simplified for stream videos */}
              {selectedMedia.item.file && !selectedMedia.item.urls.playback && (
                <div className="border-t p-6 space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Filename:</span>
                      <p className="font-medium">
                        {selectedMedia.item.file.name}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">File size:</span>
                      <p className="font-medium">
                        {(selectedMedia.item.file.size / 1024 / 1024).toFixed(
                          2,
                        )}{" "}
                        MB
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Type:</span>
                      <p className="font-medium">
                        {selectedMedia.item.file.type}
                      </p>
                    </div>
                    {selectedMedia.item.aspectRatio &&
                      selectedMedia.item.aspectRatio !== "Unknown" && (
                        <div>
                          <span className="text-muted-foreground">
                            Aspect ratio:
                          </span>
                          <p className="font-medium">
                            {selectedMedia.item.aspectRatio}
                          </p>
                        </div>
                      )}
                  </div>
                </div>
              )}

              {/* Minimal info for stream videos */}
              {selectedMedia.item.urls.playback && (
                <div className="border-t p-4">
                  <p className="text-sm text-muted-foreground text-center">
                    {selectedMedia.item.file?.name || "Uploaded Video"}
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
