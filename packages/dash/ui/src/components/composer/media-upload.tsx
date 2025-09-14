import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
} from "@dnd-kit/core";
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
import { File, Upload, Video } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Dropzone } from "@/components/dropzone";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useComposerStore } from "@/stores/composer-store";
import { DraggableMediaItem } from "./draggable-media-item";

interface MediaPreview {
  file: File; // may be an empty placeholder for remote assets
  url: string;
  aspectRatio: string;
  mimeType: string;
}

const generatePreview = async (file: File): Promise<MediaPreview> => {
  const url = URL.createObjectURL(file);

  return new Promise((resolve) => {
    if (file.type.startsWith("image/")) {
      const img = new Image();
      img.onload = () => {
        const aspectRatio = `${img.width}:${img.height}`;
        resolve({ file, url, aspectRatio, mimeType: file.type });
      };
      img.src = url;
    } else if (file.type.startsWith("video/")) {
      const video = document.createElement("video");
      video.onloadedmetadata = () => {
        const aspectRatio = `${video.videoWidth}:${video.videoHeight}`;
        resolve({ file, url, aspectRatio, mimeType: file.type });
      };
      video.src = url;
    } else {
      resolve({ file, url, aspectRatio: "Unknown", mimeType: file.type });
    }
  });
};

export function MediaUpload() {
  const {
    contentCreateData,
    removeAttachment,
    uploadAttachments,
    reorderAttachments,
  } = useComposerStore();
  const { workspace } = useWorkspace();
  const [previews, setPreviews] = useState<MediaPreview[]>([]);
  const [selectedMedia, setSelectedMedia] = useState<{
    preview: MediaPreview;
    index: number;
  } | null>(null);
  const [dragOverlay, setDragOverlay] = useState<{
    preview: MediaPreview;
    index: number;
  } | null>(null);

  // Cache previews by file reference to prevent regeneration
  const previewCacheRef = useRef(new Map<File, MediaPreview>());

  const attachments = contentCreateData.base.attachments;

  // Helper function to generate stable keys
  const getStableKey = useCallback(
    (preview: MediaPreview, index: number): string => {
      const att = attachments?.[index];
      return (
        att?.id ||
        `${preview.file.name}-${preview.file.size}-${preview.file.lastModified}`
      );
    },
    [attachments],
  );

  // Memoized preview generator that reuses existing previews
  const generatePreviewsForAttachments = useCallback(
    async (attachments: typeof contentCreateData.base.attachments) => {
      if (!attachments?.length) return [];

      const generated: MediaPreview[] = [];

      for (const att of attachments) {
        if (att.file) {
          // Check cache first
          const cached = previewCacheRef.current.get(att.file);
          if (cached) {
            generated.push(cached);
          } else {
            // Generate new preview and cache it
            const newPreview = await generatePreview(att.file);
            previewCacheRef.current.set(att.file, newPreview);
            generated.push(newPreview);
          }
        }
      }

      return generated;
    },
    [],
  );

  // Update previews when attachments change - optimized to reduce flickering
  useEffect(() => {
    let cancelled = false;

    const updatePreviews = async () => {
      const newPreviews = await generatePreviewsForAttachments(
        contentCreateData.base.attachments,
      );

      if (!cancelled) {
        setPreviews((currentPreviews) => {
          // Clean up URLs for previews that are no longer needed
          const currentFiles = new Set(newPreviews.map((p) => p.file));
          currentPreviews.forEach((p) => {
            if (!currentFiles.has(p.file) && p.url.startsWith("blob:")) {
              URL.revokeObjectURL(p.url);
              previewCacheRef.current.delete(p.file);
            }
          });

          return newPreviews;
        });
      }
    };

    if (contentCreateData.base.attachments?.length) {
      updatePreviews();
    } else {
      setPreviews((currentPreviews) => {
        currentPreviews.forEach((p) => {
          if (p.url.startsWith("blob:")) {
            URL.revokeObjectURL(p.url);
          }
        });
        previewCacheRef.current.clear();
        return [];
      });
    }

    return () => {
      cancelled = true;
    };
  }, [contentCreateData.base.attachments, generatePreviewsForAttachments]);

  // cleanup on unmount
  useEffect(() => {
    return () => {
      setPreviews((currentPreviews) => {
        currentPreviews.forEach((p) => {
          if (p.url.startsWith("blob:")) {
            URL.revokeObjectURL(p.url);
          }
        });
        return currentPreviews;
      });
    };
  }, []);

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

  return (
    <div className="space-y-3">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">Media</h3>
        {previews.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {previews.length}/10 files
          </span>
        )}
      </div>

      {/* Horizontal Media Row */}
      <div className="flex gap-2">
        {/* Add Button - Full width when no media, compact when media exists */}
        <Dropzone
          accept={{ "image/*": [], "video/*": [] }}
          maxFiles={10}
          maxSize={50 * 1024 * 1024}
          onDrop={async (files) => {
            if (!workspace?.slug) return;
            await uploadAttachments(files, workspace.slug);
          }}
          className={`${
            previews.length === 0 ? "flex-1 h-16" : "flex-shrink-0 w-16 h-16"
          } border-dashed border-2 border-muted-foreground/25 hover:border-muted-foreground/50 transition-colors rounded-lg`}
        >
          <div className="flex items-center justify-center h-full text-muted-foreground gap-2">
            {previews.length === 0 ? (
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
        {previews.length > 0 && (
          <div className="flex-1 overflow-x-auto">
            <DndContext
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={previews.map((preview, index) =>
                  getStableKey(preview, index),
                )}
                strategy={horizontalListSortingStrategy}
              >
                <div className="flex gap-2">
                  {previews.map((preview, index) => {
                    const att = attachments?.[index];
                    if (!att) return null;

                    const stableKey = getStableKey(preview, index);

                    return (
                      <DraggableMediaItem
                        key={stableKey}
                        id={stableKey}
                        preview={preview}
                        attachment={att}
                        index={index}
                        onRemove={handleRemove}
                        onClick={handleMediaClick}
                      />
                    );
                  })}
                </div>
              </SortableContext>

              {/* Drag Overlay */}
              <DragOverlay>
                {dragOverlay && (
                  <div className="relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-muted opacity-80">
                    {dragOverlay.preview.mimeType.startsWith("image/") ? (
                      <img
                        src={dragOverlay.preview.url}
                        alt="Dragging"
                        className="w-full h-full object-cover"
                      />
                    ) : dragOverlay.preview.mimeType.startsWith("video/") ? (
                      <>
                        <video
                          src={dragOverlay.preview.url}
                          className="w-full h-full object-cover"
                          muted
                        />
                        <div className="absolute bottom-1 right-1 bg-black/50 rounded p-0.5">
                          <Video className="h-2 w-2 text-white" />
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <File className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                )}
              </DragOverlay>
            </DndContext>
          </div>
        )}
      </div>

      {/* Help Text */}
      {previews.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Share photos and videos • Max 10 files, 50MB each
        </p>
      )}

      {/* Media Detail Dialog */}
      <Dialog
        open={!!selectedMedia}
        onOpenChange={() => setSelectedMedia(null)}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle>Media Details</DialogTitle>
          </DialogHeader>
          {selectedMedia && (
            <div className="flex flex-col overflow-hidden">
              {/* Media Display */}
              <div className="flex-1 flex items-center justify-center p-6 bg-muted/20">
                {selectedMedia.preview.mimeType.startsWith("image/") ? (
                  <img
                    src={selectedMedia.preview.url}
                    alt="Full size preview"
                    className="max-w-full max-h-[60vh] object-contain rounded-lg"
                  />
                ) : selectedMedia.preview.mimeType.startsWith("video/") ? (
                  <video
                    src={selectedMedia.preview.url}
                    controls
                    className="max-w-full max-h-[60vh] object-contain rounded-lg"
                  >
                    <track kind="captions" label="auto-generated" />
                  </video>
                ) : (
                  <div className="flex flex-col items-center gap-4 p-8">
                    <File className="h-16 w-16 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      {selectedMedia.preview.file.name}
                    </p>
                  </div>
                )}
              </div>

              {/* Media Info */}
              <div className="border-t p-6 space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Filename:</span>
                    <p className="font-medium">
                      {selectedMedia.preview.file.name}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">File size:</span>
                    <p className="font-medium">
                      {(selectedMedia.preview.file.size / 1024 / 1024).toFixed(
                        2,
                      )}{" "}
                      MB
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Type:</span>
                    <p className="font-medium">
                      {selectedMedia.preview.file.type}
                    </p>
                  </div>
                  {selectedMedia.preview.aspectRatio !== "Unknown" && (
                    <div>
                      <span className="text-muted-foreground">
                        Aspect ratio:
                      </span>
                      <p className="font-medium">
                        {selectedMedia.preview.aspectRatio}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
